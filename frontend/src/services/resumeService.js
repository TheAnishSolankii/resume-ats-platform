import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

// ── Queries ──────────────────────────────────────────────────────────────────

export const useResumes = () =>
  useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.get('/api/resumes/').then(r => r.data),
  })

export const useResume = (id) =>
  useQuery({
    queryKey: ['resume', id],
    queryFn: () => api.get(`/api/resumes/${id}`).then(r => r.data),
    enabled: !!id,
  })

// ── Mutations ────────────────────────────────────────────────────────────────

export const useCreateResume = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/resumes/', body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  })
}

export const useUploadResume = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, jobDescription, jobTitle, company }) => {
      const form = new FormData()
      form.append('file', file)
      if (jobDescription) form.append('job_description', jobDescription)
      if (jobTitle) form.append('job_title', jobTitle)
      if (company) form.append('company', company)
      return api.post('/api/resumes/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  })
}

export const useRewriteResume = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ resumeId, jobDescription, targetRole }) =>
      api.post(`/api/resumes/${resumeId}/rewrite`, {
        resume_id: resumeId,
        job_description: jobDescription,
        target_role: targetRole,
      }).then(r => r.data),
    onSuccess: (_, { resumeId }) => {
      qc.invalidateQueries({ queryKey: ['resume', resumeId] })
      qc.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export const useInterviewQuestions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ resumeId, jobDescription, targetRole }) =>
      api.post(`/api/resumes/${resumeId}/interview-questions`, {
        resume_id: resumeId,
        job_description: jobDescription,
        target_role: targetRole,
      }).then(r => r.data),
    onSuccess: (_, { resumeId }) => qc.invalidateQueries({ queryKey: ['resume', resumeId] }),
  })
}

export const useDeleteResume = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/api/resumes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  })
}

// ── Admin ────────────────────────────────────────────────────────────────────

export const useAdminStats = () =>
  useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/api/admin/stats').then(r => r.data),
  })

export const useAdminUsers = (page = 1, search = '') =>
  useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () =>
      api.get('/api/admin/users', { params: { page, search } }).then(r => r.data),
  })

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/api/admin/users/${id}`, body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
