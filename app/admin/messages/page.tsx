"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { ChatInterface } from "@/components/chat-interface"

type Conversation = {
  job_id: string
  contact_id: string
  contact_name: string
  job_type: string
  last_message: string
  last_time: string
}

type Message = {
  id: string
  sender_id: string
  content: string
  image_url?: string | null
  created_at: string
}

export default function AdminMessagesPage() {
  const [userId, setUserId] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedContactId, setSelectedContactId] = useState("")
  const [selectedContactName, setSelectedContactName] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const user = session.user
      setUserId(user.id)

      // Get all jobs with contractors
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, job_type, customer_name, contractor_id")
        .not("contractor_id", "is", null)

      if (!jobs || jobs.length === 0) {
        setLoading(false)
        return
      }

      // Get unique contractor IDs and their profiles
      const contractorIds = [...new Set(jobs.map((j) => j.contractor_id).filter(Boolean))]
      let profileMap: Record<string, any> = {}
      if (contractorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", contractorIds)
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
      }

      // Group jobs by contractor — one conversation per contractor
      const contractorJobMap: Record<string, any[]> = {}
      for (const job of jobs) {
        if (!contractorJobMap[job.contractor_id]) {
          contractorJobMap[job.contractor_id] = []
        }
        contractorJobMap[job.contractor_id].push(job)
      }

      // Build one conversation per contractor
      const convos: Conversation[] = []
      for (const [contractorId, contractorJobs] of Object.entries(contractorJobMap)) {
        const contractorName = profileMap[contractorId]?.username || "Contractor"

        // Get latest message between admin and this contractor
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .or(`sender_id.eq.${contractorId},receiver_id.eq.${contractorId}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        convos.push({
          job_id: contractorJobs[0].id, // Use first job for sending
          contact_id: contractorId,
          contact_name: contractorName,
          job_type: `${contractorJobs.length} job${contractorJobs.length > 1 ? "s" : ""}`,
          last_message: lastMsg?.content || "No messages yet",
          last_time: lastMsg?.created_at || new Date().toISOString(),
        })
      }

      // Sort by most recent message
      convos.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())

      setConversations(convos)

      if (convos.length > 0) {
        setSelectedJobId(convos[0].job_id)
        setSelectedContactId(convos[0].contact_id)
        setSelectedContactName(convos[0].contact_name)
        await fetchMessagesForContractor(convos[0].contact_id)
      }

      setLoading(false)
    }

    fetchConversations()
  }, [])

  const fetchMessagesForContractor = async (contractorId: string) => {
    setMessagesLoading(true)
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, image_url, created_at")
      .or(`sender_id.eq.${contractorId},receiver_id.eq.${contractorId}`)
      .order("created_at", { ascending: true })

    setMessages(data || [])
    setMessagesLoading(false)
  }

  const handleSelectConversation = async (jobId: string, contactId: string) => {
    setSelectedJobId(jobId)
    setSelectedContactId(contactId)
    const convo = conversations.find((c) => c.contact_id === contactId)
    setSelectedContactName(convo?.contact_name || "")
    await fetchMessagesForContractor(contactId)
  }

  const handleSendMessage = async (text: string) => {
    if (!userId || !selectedContactId) return

    const { data, error } = await supabase
      .from("messages")
      .insert({
        job_id: selectedJobId || null,
        sender_id: userId,
        receiver_id: selectedContactId,
        content: text,
      })
      .select("id, sender_id, content, image_url, created_at")
      .single()

    if (error) {
      alert("Error sending message: " + error.message)
    } else if (data) {
      setMessages([...messages, data])
    }
  }

  const handleSendImage = async (file: File) => {
    if (!userId || !selectedContactId) return

    const fileName = `msg-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(fileName, file, { contentType: file.type })

    if (uploadError) {
      alert("Error uploading file: " + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from("message-attachments")
      .getPublicUrl(fileName)

    const { data, error } = await supabase
      .from("messages")
      .insert({
        job_id: selectedJobId || null,
        sender_id: userId,
        receiver_id: selectedContactId,
        content: "",
        image_url: urlData.publicUrl,
      })
      .select("id, sender_id, content, image_url, created_at")
      .single()

    if (error) {
      alert("Error sending image: " + error.message)
    } else if (data) {
      setMessages([...messages, data])
    }
  }

  if (loading) return <p className="p-6">Loading messages...</p>

  return (
    <ChatInterface
      conversations={conversations}
      currentUserId={userId}
      onSelectConversation={handleSelectConversation}
      messages={messages}
      onSendMessage={handleSendMessage}
      onSendImage={handleSendImage}
      selectedContactName={selectedContactName}
      loading={messagesLoading}
    />
  )
}
