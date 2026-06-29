import { makeHttpReq } from "../helper/makeHttpReq"
import { showSuccess } from "../utils"


export type PaginationType = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type projectListProps = {
  _id: string,
  name: string,
  userId: string,
  emoji?: string,
  createdAt?: string
}

export type ProjectServerData = {
  projects: {
    projects: projectListProps[],
    pagination: PaginationType
  }
}


export type DocsServerData = {

  docs: Array<{ _id: string, title: string, fileName: string, fileUrl?: string, source_type: string }>,

}



export type reportDataType = {
  _id: string,
  title: string
  , total_source: string,
  content: string
  userId: string
  projectId: string
  source_type: string
}
export type ReportsServerData = {

  sources: Array<reportDataType>,

}




export async function getProjects(page = 1, search: string = '', userId: string): Promise<ProjectServerData> {
  const data = await makeHttpReq('GET', `projects?page=${page}&search=${search}&userId=${userId}`) as ProjectServerData
  return data

}


export const updateProject = async ({ id, name }: { id: string, name: string }) => {
  const res = await makeHttpReq<{ id?: string, name?: string }>
    ('PUT', `projects/${id}`, { id, name }) as { message: string }
  return res
};

export const deleteProject = async (id: string) => {
  const res = await makeHttpReq('DELETE', `projects/${id}`) as { message: string };
  return res;
};



export async function getDocuments(props: { userId: string, projectId: string, roomId?: string }) {
  const { userId, projectId, roomId } = props
  const params = new URLSearchParams({ projectId, userId })
  if (roomId) params.set('roomId', roomId)
  const data = await makeHttpReq('GET', `projects/docs?${params}`) as DocsServerData
  return data
}

export async function getSources(props: { userId: string, projectId: string, roomId?: string }) {
  const { userId, projectId, roomId } = props
  const params = new URLSearchParams({ projectId, userId })
  if (roomId) params.set('roomId', roomId)
  const data = await makeHttpReq('GET', `reports?${params}`) as ReportsServerData
  return data
}


export const createSummary = async (props: { projectId: string, userId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props

  const data = await makeHttpReq('POST', `reports/summary`,
    { userId, projectId, docIds }) as { status?: string; message?: string }

  if (data.status == 'ready_to_generate_source') {
    await generateSummarySource({ userId, projectId, docIds })
  }

  return data
};

export const generateSummarySource = async (props: { userId: string, projectId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props
  const data = await makeHttpReq('POST', `reports/summary-from-multiple-docs`,
    { userId, projectId, docIds }) as { status?: string; message?: string }

  if (data?.message) showSuccess(data.message)
}




// study guide

export const createStudyguide = async (props: { projectId: string, userId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props

  const data = await makeHttpReq('POST', `reports/study-guide`,
    { userId, projectId, docIds }) as { status?: string; message?: string }

  if (data.status == 'ready_to_generate_source') {
    await generateStudyguideSource({ userId, projectId, docIds })
  }

  return data
};

export const generateStudyguideSource = async (props: { userId: string, projectId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props
  const data = await makeHttpReq('POST', `reports/studyguide-from-multiple-docs`,
    { userId, projectId, docIds }) as { status?: string; message?: string }

  if (data?.message) showSuccess(data.message)
}




// MINDMAP


export const createMindMap = async (props: { projectId: string, userId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props

  const data = await makeHttpReq('POST', `reports/mindmap`,
    { userId, projectId, docIds }) as { status?: string; message?: string }

  if (data.status == 'ready_to_generate_source') {
    await generateMindMapSource({ userId, projectId, docIds })
  }

  return data
};

export const generateMindMapSource = async (props: { userId: string, projectId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props
  const data = await makeHttpReq('POST', `reports/mindmap-from-multiple-docs`,
    { userId, projectId, docIds }) as { status?: string; message?: string }

  if (data?.message) showSuccess(data.message)
}



// Audio Overview
export const createAudioOverview = async (props: { projectId: string, userId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props;
  const data = await makeHttpReq('POST', `reports/audio-overview`,
    { userId, projectId, docIds }) as { message?: string; audioUrl?: string };
  if (data?.message) showSuccess(data.message);
  return data;
};

// FAQ
export const createFaq = async (props: { projectId: string, userId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props;
  const data = await makeHttpReq('POST', `reports/faq`,
    { userId, projectId, docIds }) as { status?: string; message?: string };
  if (data.status === 'ready_to_generate_source') {
    await generateFaqSource({ userId, projectId, docIds });
  }
  return data;
};

export const generateFaqSource = async (props: { userId: string, projectId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props;
  const data = await makeHttpReq('POST', `reports/faq-from-multiple-docs`,
    { userId, projectId, docIds }) as { status?: string; message?: string };
  if (data?.message) showSuccess(data.message);
};

// Briefing Doc
export const createBriefing = async (props: { projectId: string, userId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props;
  const data = await makeHttpReq('POST', `reports/briefing`,
    { userId, projectId, docIds }) as { status?: string; message?: string };
  if (data.status === 'ready_to_generate_source') {
    await generateBriefingSource({ userId, projectId, docIds });
  }
  return data;
};

export const generateBriefingSource = async (props: { userId: string, projectId: string, docIds: string[] }) => {
  const { userId, projectId, docIds } = props;
  const data = await makeHttpReq('POST', `reports/briefing-from-multiple-docs`,
    { userId, projectId, docIds }) as { status?: string; message?: string };
  if (data?.message) showSuccess(data.message);
};

export type UserDocument={
    _id: string,
    title: string,
    description: string,
    content?: string,
    createdAt: string,
    parentId?: string | null,
  }

export type UserDocumentList = {
  documents: Array<UserDocument>
}

export async function getUserDocuments(props: { userId: string, projectId: string, roomId?: string }) {
  const { userId, projectId, roomId } = props
  const params = new URLSearchParams({ projectId, userId })
  if (roomId) params.set('roomId', roomId)
  const data = await makeHttpReq('GET', `documents?${params}`)
  return (data as UserDocumentList)
}



