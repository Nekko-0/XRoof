"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, MessageSquare, RefreshCw, Plus } from "lucide-react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { StatusBadge } from "@/components/status-badge";

type Job = {
  id: string;
  address: string;
  zip_code: string;
  job_type: string;
  description: string;
  status: "Negotiating" | "Accepted" | "Completed";
  contractor_id: string | null;
  contractor?: {
    username: string;
    company_name?: string;
  } | null;
};

type MessageActivity = {
  text: string;
  time: string;
};

export default function HomeownerDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<MessageActivity[]>([]);

  // Fetch jobs for logged-in homeowner
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch jobs
      const { data: jobsRaw, error: jobsError } = await supabase
        .from("jobs")
        .select("id, address, zip_code, job_type, description, status, contractor_id, created_at")
        .eq("homeowner_id", user.id)
        .order("created_at", { ascending: false });

      let jobsData: any[] = []
      if (jobsError) {
        console.error("Error fetching jobs:", jobsError.message);
      } else {
        // Fetch contractor profiles separately
        const contractorIds = [...new Set((jobsRaw || []).map((j: any) => j.contractor_id).filter(Boolean))]
        let profileMap: Record<string, any> = {}
        if (contractorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, company_name")
            .in("id", contractorIds)
          profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
        }
        jobsData = (jobsRaw || []).map((j: any) => ({
          ...j,
          contractor: j.contractor_id ? profileMap[j.contractor_id] || null : null,
        }))
        setJobs(jobsData);
      }

      // Fetch recent activity from messages and jobs
      const { data: messagesData } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const messageActivities = messagesData?.map((msg: any) => ({
        text: msg.content,
        time: new Date(msg.created_at).toLocaleString(),
      }));

      const jobActivities = (jobsData || []).map((job: any) => ({
        text: `You posted a job: ${job.job_type} at ${job.address}`,
        time: job.created_at ? new Date(job.created_at).toLocaleString() : "",
      }));

      setActivity([...(messageActivities || []), ...jobActivities].slice(0, 5));

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <p className="p-6">Loading dashboard...</p>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground">
            Here's an overview of your roofing project.
          </p>
        </div>
        <Link
          href="/homeowner/post-job"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Post New Job
        </Link>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {jobs.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground p-6 bg-card rounded-2xl shadow-sm">
            You have no active jobs. Post a new roofing job to get started!
          </div>
        )}

        {jobs.map((job) => (
          <div key={job.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {/* Job Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {job.status === "Negotiating" ? "Active Job" : job.status} 
              </h3>
              <StatusBadge status={job.status.toLowerCase()} />
            </div>

            {/* Job Details */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">{job.job_type}</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.address}, {job.zip_code}
                </div>
              </div>
              <div className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                {job.description}
              </div>

              {/* Contractor Info */}
              {job.contractor ? (
                <div className="mt-4 rounded-lg border border-border p-3 flex flex-col gap-2">
                  <p className="text-sm font-semibold text-muted-foreground">Assigned Contractor</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                      {job.contractor.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{job.contractor.username}</p>
                      {job.contractor.company_name && (
                        <p className="text-xs text-muted-foreground">{job.contractor.company_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      href="/homeowner/messages"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Message
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No contractor assigned yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </h3>
        <div className="flex flex-col gap-3">
          {activity.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          )}
          {activity.map((act, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
              <p className="text-sm text-foreground">{act.text}</p>
              <p className="text-xs text-muted-foreground">{act.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}