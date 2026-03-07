"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { ChatInterface } from "@/components/chat-interface"

const ADMIN_EMAIL = "contact@leons-roofing.com"

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
  created_at: string
}

export default function ContractorMessagesPage() {


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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Find admin user
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("email", ADMIN_EMAIL)
        .single()

      const adminId = adminProfile?.id || ""
      const adminName = "Admin"

      // Get all jobs assigned to this contractor
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, job_type, customer_name")
        .eq("contractor_id", user.id)

      if (!jobs || jobs.length === 0) {
        setLoading(false)
        return
      }

      // For each job, get the latest message
      const convos: Conversation[] = []
      for (const job of jobs) {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("job_id", job.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        convos.push({
          job_id: job.id,
          contact_id: adminId,
          contact_name: adminName,
          job_type: `${job.job_type} — ${job.customer_name || "Customer"}`,
          last_message: lastMsg?.content || "No messages yet",
          last_time: lastMsg?.created_at || new Date().toISOString(),
        })
      }

      setConversations(convos)

      // Auto-select first conversation
      if (convos.length > 0) {
        setSelectedJobId(convos[0].job_id)
        setSelectedContactId(convos[0].contact_id)
        setSelectedContactName(convos[0].contact_name)
        await fetchMessages(convos[0].job_id)
      }

      setLoading(false)
    }

    fetchConversations()
  }, [])

  const fetchMessages = async (jobId: string) => {
    setMessagesLoading(true)
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true })

    setMessages(data || [])
    setMessagesLoading(false)
  }

  const handleSelectConversation = async (jobId: string, contactId: string) => {
    setSelectedJobId(jobId)
    setSelectedContactId(contactId)
    const convo = conversations.find((c) => c.job_id === jobId)
    setSelectedContactName(convo?.contact_name || "")
    await fetchMessages(jobId)
  }

  const handleSendMessage = async (text: string) => {
    if (!userId || !selectedJobId || !selectedContactId) return

    const { data, error } = await supabase
      .from("messages")
      .insert({
        job_id: selectedJobId,
        sender_id: userId,
        receiver_id: selectedContactId,
        content: text,
      })
      .select("id, sender_id, content, created_at")
      .single()

    if (error) {
      alert("Error sending message: " + error.message)
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
      selectedContactName={selectedContactName}
      loading={messagesLoading}
    />
  )
}
