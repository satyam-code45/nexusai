import { makeHttpReq } from "../helper/makeHttpReq";

type ServerResponse={
    message:string
}
const downloadFileInDrive = async ({fileId, projectId,userId}:{fileId:string,projectId:string,userId:string}) => {
    try {

        const data = await makeHttpReq('POST', `addsource/upload-drive-files`,
            { fileId, userId, projectId })
    return data
    } catch (error) {
        console.error('downloadFileInDrive error:', error);
        throw error; // re-throw so the caller can show error UI
    }

};


export const uploadPickedFiles = async (props:{docs: any[], projectId: string,userId:string}) => {
    const {projectId,userId,docs}=props
    if (Array.isArray(docs)) {

        for (const doc of docs) {
            await downloadFileInDrive({fileId:doc?.id, projectId,userId});

        }

    }
};


export const sendWeblink = async (props:{webLink: string, projectId?: string,userId:string}) => {
    try {
  
    const {webLink, projectId,userId}=props
        const data = await makeHttpReq('POST', `addsource/weblink`,
            { webLink, userId, projectId }) as ServerResponse
      return data

    } catch (error) {
        console.error('sendWeblink error:', error);
        throw error; // re-throw so the caller can show error UI
    }

};


export const sendTextData = async (props:{text: string, projectId?: string,userId:string}) => {
    try {
         const {text, projectId,userId}=props
        const data = await makeHttpReq('POST', `addsource/text`,
            { text, userId, projectId }) as ServerResponse
       return data

    } catch (error) {
        console.error('sendTextData error:', error);
        throw error; // re-throw so the caller can show error UI
    }

};



export const sendYoutubeLink = async (props:{youtubeLink: string, projectId?: string,userId:string}) => {
    try {
        const {youtubeLink, projectId,userId}=props
        const data = await makeHttpReq('POST', `addsource/youtube`,
            { youtubeLink, userId, projectId })
       return data
    } catch (error) {
        console.error('sendYoutubeLink error:', error);
        throw error; // re-throw so the caller can show error UI
    }

};
