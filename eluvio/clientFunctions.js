// Simple Media Ingest
// This sample shows how to the upload of a single media file from a Front End client with an authorization token
// It creates a single playable object for each media file uploaded

import { ElvClient } from "@eluvio/elv-client-js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createClient = async () => {
    try {
        let client = await ElvClient.FromNetworkName({ networkName: "demov3" });
        let wallet = client.GenerateWallet();
        let signer = wallet.AddAccount({
        privateKey: process.env.PRIVATE_KEY
    });
    client.SetSigner({ signer: signer });
    return client;
    } catch (error) {
        console.error("Error creating client:", error);
        throw error;
    }
}

const getAuthToken = async (libraryId, objectId) => {
    const client = await createClient();
    const authToken = await client.authClient.AuthorizationToken({ libraryId, objectId, update: true });
    console.log("authToken", authToken);
    return authToken;
}

const editorSignedToken = async (contentHash) => {
    const client = await createClient();
    const authToken = await client.CreateSignedToken({
        versionHash: contentHash,
          duration: 60 * 60 * 1000 // millisec
      });
    client.SetStaticToken({ token: authToken });
    console.log("authToken", authToken);
    return authToken;
}

const getContentObject = async (libraryId) => {
    const client = await createClient();
    let contentObjects = await client.ContentObjects({ libraryId: libraryId });
    // console.log("contentObjects", contentObjects);
    for (let i = 0; i < contentObjects.contents.length; i++) {
        console.log("contentObjects", contentObjects.contents[i].versions);
    }
    return contentObjects;
}

const getContentObjectMetadata = async (contentHash) => {
    const client = await createClient();
    let meta = await client.ContentObjectMetadata({
        versionHash: contentHash,
    });
    console.log("META", meta);
    return meta;
}

const setPermissions = async (contentId, permission) => {
    const client = await createClient();
    // {
    //     owner: {
    //       short: 'Owner Only',
    //       description: 'Only the owner has access to the object and ability to change permissions',
    //       settings: { visibility: 0, statusCode: -1, kmsConk: false }
    //     },
    //     editable: {
    //       short: 'Editable',
    //       description: 'Members of the editors group have full access to the object and the ability to change permissions',
    //       settings: { visibility: 0, statusCode: -1, kmsConk: true }
    //     },
    //     viewable: {
    //       short: 'Viewable',
    //       description: "In addition to editors, members of the 'accessor' group can have read-only access to the object including playing video and retrieving metadata, images and documents",
    //       settings: { visibility: 0, statusCode: 0, kmsConk: true }
    //     },
    //     listable: {
    //       short: 'Publicly Listable',
    //       description: 'Anyone can list the public portion of this object but only accounts with specific rights can access',
    //       settings: { visibility: 1, statusCode: 0, kmsConk: true }
    //     },
    //     public: {
    //       short: 'Public',
    //       description: 'Anyone can access this object',
    //       settings: { visibility: 10, statusCode: 0, kmsConk: true }
    //     }
    //   }

    let perm = "owner";
    if (permission === "owner") {
        perm = "owner";
    } else if (permission === "editable") {
        perm = "editable";
    } else if (permission === "viewable") {
        perm = "viewable";
    } else if (permission === "listable") {
        perm = "listable";
    } else if (permission === "public") {
        perm = "public";
    } else {
        console.log("Invalid permission");
        return;
    }
    let res = await client.SetPermission({
        objectId: contentId,
        permission: perm
    });
    console.log("RES", res);
    return res;
}



export { createClient, getAuthToken, editorSignedToken, getContentObject, getContentObjectMetadata, setPermissions };
