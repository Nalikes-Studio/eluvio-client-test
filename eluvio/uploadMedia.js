// Simple Media Ingest
// This sample shows how to the upload of a single media file from a Front End client with an authorization token
// It creates a single playable object for each media file uploaded

import { ElvClient } from "@eluvio/elv-client-js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from './clientFunctions.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MediaUpload = async () => {
  // check if all the files are present
  const filePaths = [
    "./eluvio/uploads/upload_final.mp4",
  ];
  for (let i = 0; i < filePaths.length; i++) {
    if (!fs.existsSync(filePaths[i])) {
      console.log(`File ${filePaths[i]} does not exist`);
      return;
    }
  }

  //
  // BACK END
  //
  let backendClient = await createClient();

  // For debugging purposes
  //   backendClient.ToggleLogging(true);

  console.log('🔍 DEBUG: Client setup completed');
  debugger; // Breakpoint 1: After client setup

  // Send these 3 items to the front end: writeToken, authToken, node
  // Constants from tenancy
  const libraryId = process.env.LIBRARY_ID;
  const mezzType = process.env.MEZZ_TYPE;
  const masterType = process.env.MASTER_TYPE;
  const objectName = process.env.OBJECT_NAME;
  const filePath = path.resolve(__dirname, './json/abr_profile_drm_public_access.json');
  const abrProfile = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log('🔍 DEBUG: About to create content object');
  debugger; // Breakpoint 2: Before creating content object

  // Upload by creating a new object
  const newObject = await backendClient.CreateContentObject({
    libraryId,
    options: {
      meta: {
        public: {
          name: objectName,
        }
      },
      type: mezzType
    }
  })
  const objectId = newObject.id;
  const writeToken = newObject.write_token;

  // Upload to an exisiting object in case you have have created
  // the object, change objectId and generate a write token
  // const objectId = "iq__2o68yG4v44LwffBuKetPXGX79K9M"
  // const writeToken = (await backendClient.EditContentObject({libraryId, objectId})).write_token;
  console.log('🔍 DEBUG: Content object created', { objectId, writeToken });
  debugger;

  // Generate auth token
  const authToken = await backendClient.authClient.AuthorizationToken({ libraryId, objectId, update: true });
  const node = await backendClient.WriteTokenNodeUrl({ writeToken });
  console.log("Send to front end", "writeToken", writeToken, "authToken", authToken, "node", node);

  console.log('🔍 DEBUG: Tokens generated successfully');
  debugger; // Breakpoint 4: After token generation

  //
  // FRONT END
  //

  let frontendClient = await ElvClient.FromNetworkName({ networkName: "demov3" });
  frontendClient.SetNodes({ fabricURIs: [node] });
  frontendClient.SetStaticToken({ token: authToken, update: true });

  console.log('🔍 DEBUG: Frontend client setup completed');
  debugger; // Breakpoint 5: After frontend client setup

  // // Upload Files
  // const filePaths = [
  //   "./eluvio/uploads/upload_final.mp4",
  // ];
  let fileInfo = [];
  for (let i = 0; i < filePaths.length; i++) {
    const fd = fs.openSync(filePaths[i]);
    const stats = fs.statSync(filePaths[i]);
    fileInfo.push({
      path: `upload_final.mp4`,
      type: "file",
      size: stats.size,
      data: fd
    })
  }

  console.log('🔍 DEBUG: File info prepared', { fileInfo });
  debugger; // Breakpoint 6: Before starting upload process

  const callback = (fileUploadStatus) => {
    console.log(fileUploadStatus);
  };

  try {
    // Create Production Master
    const createMasterResponse = await backendClient.CreateProductionMaster({
      libraryId,
      objectId,
      fileInfo,
      callback,
      encrypt: true,
      type: masterType,
      name: objectName,
      writeToken
    })
    console.log("Master Response", createMasterResponse);

    console.log('🔍 DEBUG: Production master created');
    debugger; // Breakpoint 7: After master creation

    // Create ABR Mezzanine
    const createABRMezzResponse = await backendClient.CreateABRMezzanine({
      name: objectName,
      libraryId,
      writeToken,
      objectId,
      type: mezzType,
      masterWriteToken: writeToken,
      variant: "default",
      offeringKey: "default",
      masterVersionHash: createMasterResponse.hash,
      abrProfile
    });
    console.log("Create ABR Mezzanine", createABRMezzResponse);

    console.log('🔍 DEBUG: ABR mezzanine created');
    debugger; // Breakpoint 8: After ABR mezzanine creation

    // Start ABR Job
    const startJobsResponse = await backendClient.StartABRMezzanineJobs({
      libraryId,
      objectId,
      offeringKey: "default",
      writeToken
    });

    console.log('🔍 DEBUG: ABR jobs started', { startJobsResponse });
    debugger; // Breakpoint 9: After starting ABR jobs

    const lroWriteToken = startJobsResponse.lro_draft.write_token;
    const lroNode = startJobsResponse.lro_draft.node;
    const lroData = startJobsResponse.data;

    console.log("LRO Write Token", lroWriteToken);
    console.log("LRO Node", lroNode);
    console.log("LRO Data", lroData);

    // Check ABR Job is Finished
    let done = false;
    while (!done) {
      const lroStatus = await backendClient.LROStatus({ libraryId, objectId, writeToken });
      console.log("LRO Status", lroStatus);
      const lastStatus = lroData.every(lro => lroStatus[lro]?.run_state === "finished")
      console.log(lastStatus);
      if (lastStatus) done = true;
    }

    console.log('🔍 DEBUG: ABR jobs completed');
    debugger; // Breakpoint 10: After ABR jobs completion

    // Finalize Mezzanine Object
    if (done) {
      let finalizeAbrResponse = await backendClient.FinalizeABRMezzanine({
        libraryId,
        objectId,
        writeToken,
        offeringKey: "default"
      });
      console.log("Finalize ABR", finalizeAbrResponse);

      console.log('🔍 DEBUG: ABR finalization completed');
      debugger; // Breakpoint 11: After ABR finalization

      let finalizeContentObject = await backendClient.FinalizeContentObject({
        libraryId,
        objectId,
        writeToken,
      });
      console.log("Finalize Object", finalizeContentObject);

      console.log('🔍 DEBUG: Content object finalization completed');
      debugger; // Breakpoint 12: After content object finalization
    }
  } catch (e) {
    console.log("ERROR", e);
    console.log('🔍 DEBUG: Error occurred during processing');
    debugger; // Breakpoint 13: Error handling
  }
}

export { MediaUpload };