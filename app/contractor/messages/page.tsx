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
  image_url?: string | null
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
  const [adminId, setAdminId] = useState("")

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const user = session.user
      setUserId(user.id)

      // Find admin user
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("email", ADMIN_EMAIL)
        .single()

      const foundAdminId = adminProfile?.id || ""
      setAdminId(foundAdminId)

      // Get first job for sending messages (needed as job_id reference)
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .eq("contractor_id", user.id)
        .limit(1)

      const firstJobId = jobs?.[0]?.id || "general"

      // Get latest message between this contractor and admin
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      // Always show exactly ONE admin conversation
      const convos: Conversation[] = [{
        job_id: firstJobId,
        contact_id: foundAdminId,
        contact_name: "Admin",
        job_type: "Leon's Roofing",
        last_message: lastMsg?.content || "No messages yet",
        last_time: lastMsg?.created_at || new Date().toISOString(),
      }]

      setConversations(convos)
      setSelectedJobId(firstJobId)
      setSelectedContactId(foundAdminId)
      setSelectedContactName("Admin")
      await fetchAllMessages(user.id)

      setLoading(false)
    }

    fetchConversations()
  }, [])

  const fetchAllMessages = async (uid: string) => {
    setMessagesLoading(true)
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, image_url, created_at")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order("created_at", { ascending: true })

    setMessages(data || [])
    setMessagesLoading(false)
  }

  const handleSelectConversation = async (_jobId: string, _contactId: string) => {
    // Only one conversation, just refresh messages
    await fetchAllMessages(userId)
  }

  const handleSendMessage = async (text: string) => {
    if (!userId || !adminId) return

    const { data, error } = await supabase
      .from("messages")
      .insert({
        job_id: selectedJobId !== "general" ? selectedJobId : null,
        sender_id: userId,
        receiver_id: adminId,
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

  const handleSendImage = async (file: File) => {
    if (!userId || !adminId) return

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
        job_id: selectedJobId !== "general" ? selectedJobId : null,
        sender_id: userId,
        receiver_id: adminId,
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
