import { makeHttpReq } from "../helper/makeHttpReq"

export type ChatMessage = {
    role: 'ai' | 'user',
    content: string
    thinking:string
    userId: string
    time:string
}

export type ChatHistoryReturnType = { messages: ChatMessage[],questions:string[]}
export interface IFetchChatHistoryType{userId: string,projectId:string,roomId?:string}
export async function fetchChatHistory(props:IFetchChatHistoryType): Promise<ChatHistoryReturnType> {

    const {userId,projectId,roomId}=props
    const params = new URLSearchParams({ userId, projectId })
    if (roomId) params.set('roomId', roomId)
    const data = await makeHttpReq('GET', `agent/chat-history?${params}`) as ChatHistoryReturnType
    return data

}




export async function uploadImageToServer(
   props:{ image: File | null,
    projectId: string,
    userId: string
}
) {
    const {image,projectId,userId}=props
    const formData = new FormData();
    formData.append("file", image as File);
    formData.append("projectId", projectId);
    formData.append("userId", userId);


    const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        throw new Error("Image upload failed");
    }

    return res.json();
}