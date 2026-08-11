"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

const fmt = (d) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);

const ymd = (d) => {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const datesBetween = (start, end) => {
  const dates = [];
  let d = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (d <= last) {
    dates.push(ymd(d));
    d = addDays(d, 1);
  }
  return dates;
};

const starterCrews = [
  { id: "c1", name: "Aaron Tillman", specialty: "Water Main / Excavation", active: true },
  { id: "c2", name: "Nick Norman", specialty: "Water Main / Services", active: true },
  { id: "c3", name: "Crew 3", specialty: "General", active: true },
];

const starterProjects = [
  { id: "p1", code: "WS-742", name: "Water Main Replacement" },
  { id: "p2", code: "WS-743", name: "Water Main Replacement" },
];

const statusOptions = ["Assigned", "Tentative", "No Crew Needed", "Off"];

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(ymd(today));
  const [startDate, setStartDate] = useState(ymd(today));
  const [endDate, setEndDate] = useState(ymd(today));
  const [reportStartDate, setReportStartDate] = useState(ymd(addDays(today, -7)));
  const [reportEndDate, setReportEndDate] = useState(ymd(today));
  const [reportCrewId, setReportCrewId] = useState("");
  const [reportProjectId, setReportProjectId] = useState("");
  const [crews, setCrews] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [engineer, setEngineer] = useState("");
  const [crewId, setCrewId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("");
  const [status, setStatus] = useState("Assigned");
  const [notes, setNotes] = useState("");
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewSpecialty, setNewCrewSpecialty] = useState("");
  const [newCrewNumber, setNewCrewNumber] = useState("");
  const [newCrewSuperintendent, setNewCrewSuperintendent] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [editingCrew, setEditingCrew] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [message, setMessage] = useState("");
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [requestStartDate, setRequestStartDate] = useState(ymd(today));
  const [requestEndDate, setRequestEndDate] = useState(ymd(today));
  const [requestEngineer, setRequestEngineer] = useState("");
  const [requestProjectId, setRequestProjectId] = useState("");
  const [requestLocation, setRequestLocation] = useState("");
  const [requestWorkType, setRequestWorkType] = useState("");
  const [requestSpecialty, setRequestSpecialty] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestAssignCrewId, setRequestAssignCrewId] = useState("");
  const [loading, setLoading] = useState(true);

  const dbMode = !!supabase;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    if (supabase) {
      const [c, p, a] = await Promise.all([
        supabase.from("crews").select("*").order("name"),
        supabase.from("projects").select("*").order("code"),
        supabase.from("assignments").select("*").order("work_date"),
      ]);

      if (!c.error && !p.error && !a.error) {
        setCrews(c.data || []);
        setProjects(p.data || []);
        setAssignments(a.data || []);
        setLoading(false);
        return;
      }
    }

    const savedCrews = JSON.parse(localStorage.getItem("crewPlannerCrews") || "null");
    const savedProjects = JSON.parse(localStorage.getItem("crewPlannerProjects") || "null");
    const savedAssignments = JSON.parse(localStorage.getItem("crewPlannerAssignments") || "[]");

    setCrews(savedCrews || starterCrews);
    setProjects(savedProjects || starterProjects);
    setAssignments(savedAssignments);
    setLoading(false);
  }

  function saveLocal(nextCrews = crews, nextProjects = projects, nextAssignments = assignments) {
    localStorage.setItem("crewPlannerCrews", JSON.stringify(nextCrews));
    localStorage.setItem("crewPlannerProjects", JSON.stringify(nextProjects));
    localStorage.setItem("crewPlannerAssignments", JSON.stringify(nextAssignments));
  }

  async function saveCrew(e) {
    e.preventDefault();
    if (!newCrewName.trim()) return;
    const row = {
      name: newCrewName.trim(),
      specialty: newCrewSpecialty.trim(),
      crew_number: newCrewNumber.trim(),
      superintendent: newCrewSuperintendent.trim(),
      active: true
    };

    if (editingCrew) {
      if (supabase) {
        const { data, error } = await supabase.from("crews").update(row).eq("id", editingCrew.id).select().single();
        if (error) return flash(error.message);
        setCrews(crews.map(c => c.id === editingCrew.id ? data : c).sort((a,b)=>a.name.localeCompare(b.name)));
      } else {
        const next = crews.map(c => c.id === editingCrew.id ? { ...c, ...row } : c).sort((a,b)=>a.name.localeCompare(b.name));
        setCrews(next); saveLocal(next, projects, assignments);
      }
      flash("Crew updated.");
    } else {
      if (supabase) {
        const { data, error } = await supabase.from("crews").insert(row).select().single();
        if (error) return flash(error.message);
        setCrews([...crews, data].sort((a,b)=>a.name.localeCompare(b.name)));
      } else {
        const data = { id: crypto.randomUUID(), ...row };
        const next = [...crews, data].sort((a,b)=>a.name.localeCompare(b.name));
        setCrews(next); saveLocal(next, projects, assignments);
      }
      flash("Crew added.");
    }
    cancelCrewEdit();
  }

  function editCrew(c) {
    setEditingCrew(c);
    setNewCrewName(c.name);
    setNewCrewSpecialty(c.specialty || "");
    setNewCrewNumber(c.crew_number || "");
    setNewCrewSuperintendent(c.superintendent || "");
  }

  function cancelCrewEdit() {
    setEditingCrew(null);
    setNewCrewName("");
    setNewCrewSpecialty("");
    setNewCrewNumber("");
    setNewCrewSuperintendent("");
  }

  async function deleteCrew(id) {
    if (!confirm("Delete this crew? Existing assignment history will remain.")) return;
    if (supabase) {
      const { error } = await supabase.from("crews").delete().eq("id", id);
      if (error) return flash(error.message);
    }
    const next = crews.filter(c => c.id !== id);
    setCrews(next);
    if (!supabase) saveLocal(next, projects, assignments);
    flash("Crew deleted.");
  }

  async function saveProject(e) {
    e.preventDefault();
    if (!newProjectCode.trim()) return;
    const row = { code: newProjectCode.trim().toUpperCase(), name: newProjectName.trim() };

    if (editingProject) {
      if (supabase) {
        const { data, error } = await supabase.from("projects").update(row).eq("id", editingProject.id).select().single();
        if (error) return flash(error.message);
        setProjects(projects.map(p => p.id === editingProject.id ? data : p).sort((a,b)=>a.code.localeCompare(b.code)));
      } else {
        const next = projects.map(p => p.id === editingProject.id ? { ...p, ...row } : p).sort((a,b)=>a.code.localeCompare(b.code));
        setProjects(next); saveLocal(crews, next, assignments);
      }
      flash("Project updated.");
    } else {
      if (supabase) {
        const { data, error } = await supabase.from("projects").insert(row).select().single();
        if (error) return flash(error.message);
        setProjects([...projects, data].sort((a,b)=>a.code.localeCompare(b.code)));
      } else {
        const data = { id: crypto.randomUUID(), ...row };
        const next = [...projects, data].sort((a,b)=>a.code.localeCompare(b.code));
        setProjects(next); saveLocal(crews, next, assignments);
      }
      flash("Project added.");
    }
    cancelProjectEdit();
  }

  function editProject(p) {
    setEditingProject(p);
    setNewProjectCode(p.code);
    setNewProjectName(p.name || "");
  }

  function cancelProjectEdit() {
    setEditingProject(null);
    setNewProjectCode("");
    setNewProjectName("");
  }

  async function deleteProject(id) {
    if (!confirm("Delete this project? Existing assignment history will remain.")) return;
    if (supabase) {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) return flash(error.message);
    }
    const next = projects.filter(p => p.id !== id);
    setProjects(next);
    if (!supabase) saveLocal(crews, next, assignments);
    flash("Project deleted.");
  }

  async function createAssignment(e) {
    e.preventDefault();

    if (endDate < startDate) return flash("End date cannot be before start date.");
    if (status !== "No Crew Needed" && !crewId) return flash("Please select a crew.");
    if (!engineer.trim()) return flash("Please enter engineer name.");

    const range = datesBetween(startDate, endDate);

    if (crewId && ["Assigned", "Requested", "Tentative"].includes(status)) {
      const conflict = assignments.find(
        (a) =>
          String(a.crew_id) === String(crewId) &&
          range.includes(a.work_date) &&
          ["Assigned", "Requested", "Tentative"].includes(a.status)
      );
      if (conflict) {
        const c = crews.find(x => String(x.id) === String(crewId));
        return flash(`${c?.name || "This crew"} is already booked on ${conflict.work_date}.`);
      }
    }

    const rows = range.map((work_date) => ({
      work_date,
      engineer: engineer.trim(),
      crew_id: crewId || null,
      project_id: projectId || null,
      location: location.trim(),
      work_type: workType.trim(),
      status,
      notes: notes.trim(),
    }));

    if (supabase) {
      const { data, error } = await supabase.from("assignments").insert(rows).select();
      if (error) return flash(error.message);
      setAssignments([...assignments, ...(data || [])]);
    } else {
      const data = rows.map(row => ({ id: crypto.randomUUID(), ...row }));
      const next = [...assignments, ...data];
      setAssignments(next);
      saveLocal(crews, projects, next);
    }

    setCrewId("");
    setProjectId("");
    setLocation("");
    setWorkType("");
    setNotes("");
    setStatus("Assigned");
    setSelectedDate(startDate);
    flash(range.length === 1 ? "Assignment saved." : `Assignment saved for ${range.length} days.`);
    setActiveTab("dashboard");
  }

  async function deleteAssignment(id) {
    if (supabase) {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) return flash(error.message);
    }
    const next = assignments.filter((a) => a.id !== id);
    setAssignments(next);
    if (!supabase) saveLocal(crews, projects, next);
  }

  function flash(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }


  const assignmentFor = (crewId, date) =>
    assignments.find((a) => String(a.crew_id) === String(crewId) && a.work_date === date && !["Off", "Crew Called Off", "No Work", "Cancelled"].includes(a.status));

  const dateAssignments = assignments.filter((a) => a.work_date === selectedDate);
  const nonBlockingStatuses = ["Off", "Crew Called Off", "No Work", "Cancelled"];
  const busyCrewIds = new Set(
    dateAssignments.filter(a => a.crew_id && !nonBlockingStatuses.includes(a.status)).map((a) => String(a.crew_id))
  );
  const availableCrews = crews.filter((c) => c.active !== false && !busyCrewIds.has(String(c.id)));

  const lookAheadDates = Array.from({ length: 14 }, (_, n) =>
    ymd(addDays(new Date(selectedDate + "T12:00:00"), n))
  );

  const upcomingAssignments14 = assignments
    .filter((a) => lookAheadDates.includes(a.work_date))
    .sort((a, b) => a.work_date.localeCompare(b.work_date));

  const projectName = (id) => {
    const p = projects.find((x) => String(x.id) === String(id));
    return p ? p.code : "—";
  };

  const crewName = (id) => {
    const c = crews.find((x) => String(x.id) === String(id));
    return c ? c.name : "No Crew";
  };



  async function updateAssignmentAction(assignment, action) {
    if (!assignment) return;
    if (action === "delete") {
      await deleteAssignment(assignment.id);
      setEditingAssignment(null);
      flash("Assignment removed.");
      return;
    }
    const statusMap = { calledoff: "Crew Called Off", nowork: "No Work", cancelled: "Cancelled" };
    const newStatus = statusMap[action];
    if (!newStatus) return;
    const originalCrew = crewName(assignment.crew_id);
    const updatedNotes = [assignment.notes || "", `${newStatus}. Original crew: ${originalCrew}.`].filter(Boolean).join(" ");
    if (supabase) {
      const { data, error } = await supabase.from("assignments").update({ status: newStatus, crew_id: null, notes: updatedNotes }).eq("id", assignment.id).select().single();
      if (error) return flash(error.message);
      setAssignments(assignments.map(a => a.id === assignment.id ? data : a));
    } else {
      const next = assignments.map(a => a.id === assignment.id ? { ...a, status: newStatus, crew_id: null, notes: updatedNotes } : a);
      setAssignments(next); saveLocal(crews, projects, next);
    }
    setEditingAssignment(null);
    flash(`${originalCrew} is now available.`);
  }

  async function createCrewRequest(e) {
    e.preventDefault();
    if (!requestEngineer.trim()) return flash("Please enter requester / engineer name.");
    if (!requestProjectId) return flash("Please select a project.");
    if (!requestLocation.trim()) return flash("Please enter the work location.");
    if (!requestWorkType.trim()) return flash("Please enter the work type.");
    if (requestEndDate < requestStartDate) return flash("End date cannot be before start date.");
    const range = datesBetween(requestStartDate, requestEndDate);
    const rows = range.map(date => ({ work_date: date, engineer: requestEngineer.trim(), crew_id: null, project_id: requestProjectId, location: requestLocation.trim(), work_type: requestWorkType.trim(), status: "Crew Requested", notes: [requestSpecialty.trim() ? `Requested crew type: ${requestSpecialty.trim()}.` : "", requestNotes.trim()].filter(Boolean).join(" ") }));
    if (supabase) {
      const { data, error } = await supabase.from("assignments").insert(rows).select();
      if (error) return flash(error.message);
      setAssignments([...assignments, ...(data || [])]);
    } else {
      const data = rows.map(r => ({ id: crypto.randomUUID(), ...r }));
      const next = [...assignments, ...data]; setAssignments(next); saveLocal(crews, projects, next);
    }
    setRequestProjectId(""); setRequestLocation(""); setRequestWorkType(""); setRequestSpecialty(""); setRequestNotes("");
    flash(`Crew request created for ${range.length} day${range.length === 1 ? "" : "s"}.`);
  }

  const crewRequestRows = assignments.filter(a => a.status === "Crew Requested" && !a.crew_id).sort((a,b) => a.work_date.localeCompare(b.work_date));
  const groupedCrewRequests = [];
  for (const row of crewRequestRows) {
    const key = [row.engineer || "", row.project_id || "", row.location || "", row.work_type || "", row.notes || ""].join("||");
    const previous = groupedCrewRequests[groupedCrewRequests.length - 1];
    if (previous && previous.key === key && ymd(addDays(new Date(previous.endDate + "T12:00:00"), 1)) === row.work_date) { previous.endDate = row.work_date; previous.ids.push(row.id); }
    else groupedCrewRequests.push({ key, startDate: row.work_date, endDate: row.work_date, ids: [row.id], engineer: row.engineer, project_id: row.project_id, location: row.location, work_type: row.work_type, notes: row.notes });
  }

  async function assignCrewToRequest(requestGroup, crewId) {
    if (!crewId) return flash("Select an available crew.");
    const requestedDates = datesBetween(requestGroup.startDate, requestGroup.endDate);
    const conflict = assignments.find(a => String(a.crew_id) === String(crewId) && requestedDates.includes(a.work_date) && !["Off", "Crew Called Off", "No Work", "Cancelled"].includes(a.status));
    if (conflict) return flash(`${crewName(crewId)} is already booked on ${conflict.work_date}.`);
    if (supabase) {
      const { data, error } = await supabase.from("assignments").update({ crew_id: crewId, status: "Assigned" }).in("id", requestGroup.ids).select();
      if (error) return flash(error.message);
      const updatedById = new Map((data || []).map(r => [r.id, r])); setAssignments(assignments.map(a => updatedById.get(a.id) || a));
    } else {
      const ids = new Set(requestGroup.ids); const next = assignments.map(a => ids.has(a.id) ? { ...a, crew_id: crewId, status: "Assigned" } : a); setAssignments(next); saveLocal(crews, projects, next);
    }
    setRequestAssignCrewId(""); flash(`${crewName(crewId)} assigned to the request.`);
  }

  async function cancelCrewRequest(requestGroup) {
    if (supabase) { const { error } = await supabase.from("assignments").delete().in("id", requestGroup.ids); if (error) return flash(error.message); }
    const ids = new Set(requestGroup.ids); const next = assignments.filter(a => !ids.has(a.id)); setAssignments(next); if (!supabase) saveLocal(crews, projects, next); flash("Crew request cancelled.");
  }

  function isWeekendDate(dateString) {
    const day = new Date(dateString + "T12:00:00").getDay();
    return day === 0 || day === 6;
  }

  const flowDateAssignments = assignments
    .filter(a => a.work_date === selectedDate)
    .filter(a => a.crew_id)
    .filter(a => !["Off", "Crew Called Off", "No Work", "Cancelled"].includes(a.status));

  const todayFlowRows = crews
    .filter(c => c.active !== false)
    .map(c => ({ crew: c, assignment: flowDateAssignments.find(a => String(a.crew_id) === String(c.id)) || null }));

  const superintendentGroups = {};
  crews.filter(c => c.active !== false).forEach(c => {
    const sup = c.superintendent?.trim() || "Unassigned Superintendent";
    if (!superintendentGroups[sup]) superintendentGroups[sup] = [];
    superintendentGroups[sup].push(c);
  });

  const reportRows = assignments
    .filter((a) => a.work_date >= reportStartDate && a.work_date <= reportEndDate)
    .filter((a) => !reportCrewId || String(a.crew_id) === String(reportCrewId))
    .filter((a) => !reportProjectId || String(a.project_id) === String(reportProjectId))
    .sort((a,b) => a.work_date.localeCompare(b.work_date))
    .map((a) => ({
      Date: a.work_date,
      "Crew / Foreman": crewName(a.crew_id),
      Project: projectName(a.project_id),
      Engineer: a.engineer || "",
      Location: a.location || "",
      "Work Type": a.work_type || "",
      Status: a.status || "",
      Notes: a.notes || ""
    }));

  function downloadExcel() {
    if (reportEndDate < reportStartDate) return flash("End date cannot be before start date.");
    if (reportRows.length === 0) return flash("No report data found for the selected dates.");

    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    worksheet["!cols"] = [
      { wch: 13 }, { wch: 24 }, { wch: 14 }, { wch: 22 },
      { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 40 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Crew Report");

    const crewPart = reportCrewId ? "-" + crewName(reportCrewId).replace(/[^a-zA-Z0-9]+/g, "-") : "";
    const projectPart = reportProjectId ? "-" + projectName(reportProjectId) : "";

    XLSX.writeFile(
      workbook,
      `LGC-Crew-Report-${reportStartDate}-to-${reportEndDate}${crewPart}${projectPart}.xlsx`
    );
  }

  const tabButtons = [
    ["dashboard", "Dashboard"],
    ["assign", "Assign Crew"],
    ["requests", "Crew Requests"],
    ["availability", "Availability"],
    ["crews", "Crews"],
    ["projects", "Projects"],
    ["reports", "Reports"],
    ["flow", "Crew Flow"],
  ];

  return (
    <main>
      <header className="topbar">
        <div className="brandWrap">
          <img
            src="/lgc-global-logo.png"
            alt="LGC Global"
            className="officialLogo"
          />
          <div className="portalLabel">CREW PLANNING PORTAL</div>
        </div>
        <div className="headerActions">
          <div className={`mode ${dbMode ? "live" : ""}`}>
            {dbMode ? "Shared Database" : "Demo / Local Mode"}
          </div>
          <button className="logoutBtn" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="nav">
        {tabButtons.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={activeTab === key ? "active" : ""}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="container">
        {message && <div className="toast">{message}</div>}

        {loading ? (
          <div className="card">Loading...</div>
        ) : activeTab === "dashboard" ? (
          <>
            <div className="pageHead">
              <div>
                <h1>Crew Dashboard</h1>
                <p>See who is working and who is available.</p>
              </div>
              <input
                className="dateInput"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="stats">
              <div className="stat"><span>Total Crews</span><strong>{crews.filter(c=>c.active!==false).length}</strong></div>
              <div className="stat green"><span>Available</span><strong>{availableCrews.length}</strong></div>
              <div className="stat red"><span>Assigned / Reserved</span><strong>{busyCrewIds.size}</strong></div>
              <div className="stat"><span>Entries Today</span><strong>{dateAssignments.length}</strong></div>
            </div>

            <div className="dashboardRequestCard">
              <div>
                <div className="requestStatus">OPEN CREW REQUESTS</div>
                <strong>{groupedCrewRequests.length}</strong>
                <span>request{groupedCrewRequests.length===1 ? "" : "s"} waiting for a crew</span>
              </div>
              <button className="smallBtn" onClick={()=>setActiveTab("requests")}>View Requests</button>
            </div>

            <div className="card">
              <div className="lookAheadHead">
                <div>
                  <div className="cardTitle">2-Week Look Ahead</div>
                  <div className="cardSub">Project, work type, location, and availability for the next 14 days.</div>
                </div>
                <span className="scrollHint">Scroll right →</span>
              </div>
              <div className="tableWrap twoWeekWrap">
                <table className="twoWeekTable">
                  <thead>
                    <tr>
                      <th className="stickyCrewCol">Crew</th>
                      {lookAheadDates.map((date) => (
                        <th key={date} className={isWeekendDate(date) ? "weekendDate" : ""}>{fmt(new Date(date + "T12:00:00"))}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crews.filter(c=>c.active!==false).map(c => (
                      <tr key={c.id}>
                        <td className="stickyCrewCol"><strong>{c.name}</strong></td>
                        {lookAheadDates.map((date) => {
                          const a = assignmentFor(c.id, date);
                          return (
                            <td key={date} className={`${a ? "lookBusyCell" : ""} ${isWeekendDate(date) ? "weekendCell" : ""}`}>
                              {a ? (
                                <div className="cellBusy detailedCell">
                                  <b>{a.status}</b>
                                  <span>{projectName(a.project_id)}</span>
                                  <small className="workTypeText">{a.work_type || "Work type not entered"}</small>
                                  <small>{a.location || "Location not entered"}</small>
                                  <button
                                    className="miniEdit"
                                    onClick={() => setEditingAssignment(a)}
                                    title="Edit this assignment"
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <span className="availableText">● Available</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid2">
              <div className="card">
                <div className="cardTitle">Available Crews</div>
                {availableCrews.length === 0 ? (
                  <div className="empty">No crews available on this date.</div>
                ) : (
                  availableCrews.map((c) => (
                    <div className="crewRow" key={c.id}>
                      <div className="dot greenDot"></div>
                      <div>
                        <strong>{c.name}</strong>
                        <small>{c.specialty || "General crew"}</small>
                      </div>
                      <span className="badge available">Available</span>
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <div className="cardTitle">Assignments</div>
                {dateAssignments.length === 0 ? (
                  <div className="empty">No assignments entered yet.</div>
                ) : (
                  dateAssignments.map((a) => (
                    <div className="assignment" key={a.id}>
                      <div>
                        <strong>{crewName(a.crew_id)}</strong>
                        <div className="assignmentMeta">
                          {projectName(a.project_id)}
                          {a.work_type ? ` • ${a.work_type}` : ""}
                          {a.location ? ` • ${a.location}` : ""}
                        </div>
                        <small>{a.engineer} • {a.status}</small>
                      </div>
                      <button className="delete" onClick={() => setEditingAssignment(a)}>Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </>
        ) : activeTab === "assign" ? (
          <>
            <div className="pageHead">
              <div><h1>Assign Crew</h1><p>Assign a crew for one day or a date range.</p></div>
            </div>
            <form className="card form" onSubmit={createAssignment}>
              <div className="formGrid">
                <label>
                  Start Date
                  <input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value); if(endDate < e.target.value) setEndDate(e.target.value)}} required />
                </label>
                <label>
                  End Date
                  <input type="date" min={startDate} value={endDate} onChange={e=>setEndDate(e.target.value)} required />
                </label>
                <label>
                  Engineer
                  <input value={engineer} onChange={e=>setEngineer(e.target.value)} placeholder="Engineer name" required />
                </label>
                <label>
                  Status
                  <select value={status} onChange={e=>setStatus(e.target.value)}>
                    {statusOptions.map(s=><option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>
                  Crew / Foreman
                  <select value={crewId} onChange={e=>setCrewId(e.target.value)} disabled={status==="No Crew Needed"}>
                    <option value="">Select crew</option>
                    {crews.filter(c=>c.active!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>
                  Project
                  <select value={projectId} onChange={e=>setProjectId(e.target.value)}>
                    <option value="">Select project</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </label>
                <label>
                  Location
                  <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Example: Binder St" />
                </label>
                <label>
                  Work Type
                  <input value={workType} onChange={e=>setWorkType(e.target.value)} placeholder="WM install, tie-in, services..." />
                </label>
                <label className="wide">
                  Notes
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes" rows="3"></textarea>
                </label>
              </div>
              <button className="primary" type="submit">Save Assignment</button>
            </form>

            <div className="card">
              <div className="lookAheadHead">
                <div>
                  <div className="cardTitle">Manage Upcoming Assignments</div>
                  <div className="cardSub">Remove a crew assignment without going back to the dashboard.</div>
                </div>
                <span className="countPill">{upcomingAssignments14.length}</span>
              </div>

              {upcomingAssignments14.length === 0 ? (
                <div className="empty">No assignments in the next 14 days.</div>
              ) : (
                <div className="manageAssignmentsList">
                  {upcomingAssignments14.map((a) => (
                    <div className="manageAssignmentRow" key={a.id}>
                      <div className="manageDate">{fmt(new Date(a.work_date + "T12:00:00"))}</div>
                      <div className="manageAssignmentInfo">
                        <strong>{crewName(a.crew_id)}</strong>
                        <span>
                          {projectName(a.project_id)}
                          {a.work_type ? ` • ${a.work_type}` : ""}
                          {a.location ? ` • ${a.location}` : ""}
                        </span>
                        <small>{a.engineer} • {a.status}</small>
                      </div>
                      <button className="delete" onClick={() => setEditingAssignment(a)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : activeTab === "requests" ? (
          <>
            <div className="hero"><div><div className="eyebrow">CREW DEMAND</div><h1>Crew Requests</h1><p>Request a crew for a period, project, location, and work type — without choosing a specific crew.</p></div></div>
            <div className="grid2 requestGrid">
              <form className="card form" onSubmit={createCrewRequest}>
                <div className="cardTitle">Request a Crew</div><div className="cardSub requestIntro">Use this when work needs a crew but the specific foreman has not been decided yet.</div>
                <div className="formGrid">
                  <label>Start Date<input type="date" value={requestStartDate} onChange={e=>{setRequestStartDate(e.target.value);if(requestEndDate<e.target.value)setRequestEndDate(e.target.value)}}/></label>
                  <label>End Date<input type="date" min={requestStartDate} value={requestEndDate} onChange={e=>setRequestEndDate(e.target.value)}/></label>
                  <label>Requested By / Engineer<input value={requestEngineer} onChange={e=>setRequestEngineer(e.target.value)} placeholder="Engineer name"/></label>
                  <label>Project<select value={requestProjectId} onChange={e=>setRequestProjectId(e.target.value)}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></label>
                  <label>Location<input value={requestLocation} onChange={e=>setRequestLocation(e.target.value)} placeholder="Example: Binder St"/></label>
                  <label>Work Type<input value={requestWorkType} onChange={e=>setRequestWorkType(e.target.value)} placeholder="Example: WM Install / Tie-In"/></label>
                  <label className="wide">Preferred Crew Type / Specialty<input value={requestSpecialty} onChange={e=>setRequestSpecialty(e.target.value)} placeholder="Optional: Water Main, Services, Restoration..."/></label>
                  <label className="wide">Notes<textarea rows="3" value={requestNotes} onChange={e=>setRequestNotes(e.target.value)} placeholder="Optional notes"/></label>
                </div><button className="requestBtn" type="submit">Submit Crew Request</button>
              </form>
              <div className="card requestSummaryCard"><div className="cardTitle">Open Requests</div><div className="requestBigNumber">{groupedCrewRequests.length}</div><div className="centerText">crew request{groupedCrewRequests.length===1?"":"s"} waiting for assignment</div><div className="requestHelp"><strong>How this works</strong><span>1. Engineer submits the work need.</span><span>2. Everyone can see the request.</span><span>3. An available crew is assigned later.</span></div></div>
            </div>
            <div className="card">
              <div className="lookAheadHead"><div><div className="cardTitle">Open Crew Requests</div><div className="cardSub">Requests are not tied to any crew name until someone assigns one.</div></div><span className="requestBadge">{groupedCrewRequests.length} Open</span></div>
              {groupedCrewRequests.length===0?<div className="empty">No open crew requests.</div>:<div className="requestList">{groupedCrewRequests.map((r,index)=><div className="requestCard" key={r.key+r.startDate+index}><div className="requestTop"><div><div className="requestStatus">CREW REQUESTED</div><h3>{projectName(r.project_id)} • {r.work_type}</h3><div className="requestLocation">{r.location}</div></div><div className="requestDates">{fmt(new Date(r.startDate+"T12:00:00"))}{r.endDate!==r.startDate?` – ${fmt(new Date(r.endDate+"T12:00:00"))}`:""}</div></div><div className="requestMeta"><span><b>Requested by:</b> {r.engineer}</span>{r.notes&&<span><b>Notes:</b> {r.notes}</span>}</div><div className="requestAssignBar"><select value={requestAssignCrewId} onChange={e=>setRequestAssignCrewId(e.target.value)}><option value="">Select available crew</option>{crews.filter(c=>c.active!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="primary" onClick={()=>assignCrewToRequest(r,requestAssignCrewId)}>Assign Crew</button><button className="secondary dangerText" onClick={()=>cancelCrewRequest(r)}>Cancel Request</button></div></div>)}</div>}
            </div>
          </>
        ) : activeTab === "availability" ? (
          <>
            <div className="pageHead">
              <div><h1>Check Availability</h1><p>Select any date to see free crews immediately.</p></div>
              <input className="dateInput" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
            </div>
            <div className="card">
              <div className="bigAvailable">{availableCrews.length}</div>
              <div className="centerText">crew{availableCrews.length===1?"":"s"} available on {fmt(new Date(selectedDate+"T12:00:00"))}</div>
              <div className="availabilityList">
                {availableCrews.map(c=>(
                  <div className="crewRow" key={c.id}>
                    <div className="dot greenDot"></div>
                    <div><strong>{c.name}</strong><small>{c.crew_number ? `${c.crew_number} • ` : ""}{c.specialty || "General"}</small>{c.superintendent && <small>Superintendent: {c.superintendent}</small>}</div>
                    <button className="smallBtn" onClick={()=>{setCrewId(String(c.id)); setStartDate(selectedDate); setEndDate(selectedDate); setActiveTab("assign")}}>Assign</button>
                  </div>
                ))}
                {availableCrews.length===0 && <div className="empty">No crews available.</div>}
              </div>
            </div>
          </>
        ) : activeTab === "crews" ? (
          <>
            <div className="pageHead"><div><h1>Crews</h1><p>Add each foreman / crew once.</p></div></div>
            <div className="grid2">
              <form className="card form" onSubmit={saveCrew}>
                <div className="cardTitle">{editingCrew ? "Edit Crew" : "Add Crew"}</div>
                <label>Foreman / Crew Name<input value={newCrewName} onChange={e=>setNewCrewName(e.target.value)} placeholder="Example: Aaron Tillman" /></label>
                <label>Specialty<input value={newCrewSpecialty} onChange={e=>setNewCrewSpecialty(e.target.value)} placeholder="Example: Water Main / Services" /></label>
                <label>Crew Number<input value={newCrewNumber} onChange={e=>setNewCrewNumber(e.target.value)} placeholder="Example: Crew 3" /></label>
                <label>Superintendent<input value={newCrewSuperintendent} onChange={e=>setNewCrewSuperintendent(e.target.value)} placeholder="Example: John Smith" /></label>
                <div className="buttonRow">
                  <button className="primary" type="submit">{editingCrew ? "Save Changes" : "Add Crew"}</button>
                  {editingCrew && <button className="secondary" type="button" onClick={cancelCrewEdit}>Cancel</button>}
                </div>
              </form>
              <div className="card">
                <div className="cardTitle">Crew List</div>
                {crews.map(c=><div className="crewRow manageRow" key={c.id}><div className="dot"></div><div><strong>{c.name}</strong><small>{c.crew_number ? `${c.crew_number} • ` : ""}{c.specialty || "General"}</small>{c.superintendent && <small>Superintendent: {c.superintendent}</small>}</div><button className="editBtn" onClick={()=>editCrew(c)}>Edit</button><button className="delete" onClick={()=>deleteCrew(c.id)}>Delete</button></div>)}
              </div>
            </div>
          </>
        ) : activeTab === "projects" ? (
          <>
            <div className="pageHead"><div><h1>Projects</h1><p>Add the projects engineers can select.</p></div></div>
            <div className="grid2">
              <form className="card form" onSubmit={saveProject}>
                <div className="cardTitle">{editingProject ? "Edit Project" : "Add Project"}</div>
                <label>Project Code<input value={newProjectCode} onChange={e=>setNewProjectCode(e.target.value)} placeholder="Example: WS-742" /></label>
                <label>Project Name<input value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} placeholder="Example: Water Main Replacement" /></label>
                <div className="buttonRow">
                  <button className="primary" type="submit">{editingProject ? "Save Changes" : "Add Project"}</button>
                  {editingProject && <button className="secondary" type="button" onClick={cancelProjectEdit}>Cancel</button>}
                </div>
              </form>
              <div className="card">
                <div className="cardTitle">Project List</div>
                {projects.map(p=><div className="projectRow manageRow" key={p.id}><div className="projectInfo"><strong>{p.code}</strong><span>{p.name || "—"}</span></div><button className="editBtn" onClick={()=>editProject(p)}>Edit</button><button className="delete" onClick={()=>deleteProject(p.id)}>Delete</button></div>)}
              </div>
            </div>
          </>
        ) : activeTab === "reports" ? (
          <>
            <div className="pageHead">
              <div><h1>Crew Work Report</h1><p>Select dates, review crew work, and download the results to Excel.</p></div>
            </div>

            <div className="card form reportFilters">
              <div className="cardTitle">Report Filters</div>
              <div className="formGrid">
                <label>Start Date<input type="date" value={reportStartDate} onChange={e=>setReportStartDate(e.target.value)} /></label>
                <label>End Date<input type="date" min={reportStartDate} value={reportEndDate} onChange={e=>setReportEndDate(e.target.value)} /></label>
                <label>Crew / Foreman<select value={reportCrewId} onChange={e=>setReportCrewId(e.target.value)}><option value="">All Crews</option>{crews.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>Project<select value={reportProjectId} onChange={e=>setReportProjectId(e.target.value)}><option value="">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></label>
              </div>

              <div className="reportActions">
                <div className="reportCount"><strong>{reportRows.length}</strong><span>schedule record{reportRows.length===1 ? "" : "s"} found</span></div>
                <button className="excelBtn" type="button" onClick={downloadExcel}>Download Excel</button>
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">Report Preview</div>
              <div className="cardSub">{reportStartDate} through {reportEndDate}</div>

              {reportRows.length === 0 ? (
                <div className="empty">No crew work found for the selected filters.</div>
              ) : (
                <div className="tableWrap reportPreview">
                  <table className="reportTable">
                    <thead><tr><th>Date</th><th>Crew / Foreman</th><th>Project</th><th>Engineer</th><th>Location</th><th>Work Type</th><th>Status</th><th>Notes</th></tr></thead>
                    <tbody>
                      {reportRows.map((r,i)=>(
                        <tr key={`${r.Date}-${r["Crew / Foreman"]}-${i}`}>
                          <td>{r.Date}</td><td><strong>{r["Crew / Foreman"]}</strong></td><td>{r.Project}</td><td>{r.Engineer}</td><td>{r.Location}</td><td>{r["Work Type"]}</td><td>{r.Status}</td><td>{r.Notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="pageHead">
              <div><h1>Crew Flow</h1><p>See where every crew is working and the superintendent-to-foreman mapping.</p></div>
              <input className="dateInput" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
            </div>

            <div className="card">
              <div className="cardTitle">Daily Crew Flow</div>
              <div className="cardSub flowSub">Superintendent → Foreman / Crew → Project → Work Type → Location</div>
              <div className="flowList">
                {todayFlowRows.map(({crew, assignment}) => (
                  <div className="flowRow" key={crew.id}>
                    <div className="flowNode supNode"><small>Superintendent</small><strong>{crew.superintendent || "Not Assigned"}</strong></div>
                    <div className="flowArrow">→</div>
                    <div className="flowNode foremanNode"><small>{crew.crew_number || "Crew"}</small><strong>{crew.name}</strong></div>
                    <div className="flowArrow">→</div>
                    {assignment ? (
                      <div className="flowNode projectNode"><small>{projectName(assignment.project_id)}</small><strong>{assignment.work_type || "Work type not entered"}</strong><span>{assignment.location || "Location not entered"}</span></div>
                    ) : (
                      <div className="flowNode availableNode"><small>Status</small><strong>Available</strong><span>No assignment for this date</span></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">Superintendent / Crew Map</div>
              <div className="cardSub flowSub">Superintendent → Crew Number → Foreman</div>
              <div className="superintendentGrid">
                {Object.entries(superintendentGroups).map(([superintendent, crewList]) => (
                  <div className="superintendentCard" key={superintendent}>
                    <div className="superintendentHead"><small>SUPERINTENDENT</small><strong>{superintendent}</strong><span>{crewList.length} crew{crewList.length===1 ? "" : "s"}</span></div>
                    <div className="superintendentCrewList">
                      {crewList.map(c => (
                        <div className="superintendentCrew" key={c.id}><div><strong>{c.crew_number || "Crew"}</strong><span>{c.name}</span></div><small>{c.specialty || "General"}</small></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {editingAssignment && (
        <div className="editModalBackdrop" onClick={()=>setEditingAssignment(null)}>
          <div className="editModal" onClick={e=>e.stopPropagation()}>
            <div className="editModalHead"><div><div className="eyebrow">ASSIGNMENT ACTIONS</div><h2>{crewName(editingAssignment.crew_id)}</h2><p>{projectName(editingAssignment.project_id)}{editingAssignment.work_type?` • ${editingAssignment.work_type}`:""}{editingAssignment.location?` • ${editingAssignment.location}`:""}</p></div><button className="modalClose" onClick={()=>setEditingAssignment(null)}>×</button></div>
            <div className="editOptionGrid">
              <button className="actionOption amberOption" onClick={()=>updateAssignmentAction(editingAssignment,"calledoff")}><strong>Crew Called Off</strong><span>Release the crew and make them available.</span></button>
              <button className="actionOption blueOption" onClick={()=>updateAssignmentAction(editingAssignment,"nowork")}><strong>No Work</strong><span>Remove this work day and release the crew.</span></button>
              <button className="actionOption grayOption" onClick={()=>updateAssignmentAction(editingAssignment,"cancelled")}><strong>Cancel Assignment</strong><span>Cancel this assignment and return the crew to availability.</span></button>
              <button className="actionOption redOption" onClick={()=>updateAssignmentAction(editingAssignment,"delete")}><strong>Delete Entry</strong><span>Permanently remove this schedule entry.</span></button>
            </div><button className="secondary fullWidthBtn" onClick={()=>setEditingAssignment(null)}>Close</button>
          </div>
        </div>
      )}

      <footer>
        LGC Global • Crew Planning Portal
      </footer>
    </main>
  );
}
