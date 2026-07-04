import { makeHttpReq } from "../helper/makeHttpReq";

type ServerResponse={
    message:string
}

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
