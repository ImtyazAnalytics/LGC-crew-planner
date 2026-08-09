"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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

const starterCrews = [
  { id: "c1", name: "Aaron Tillman", specialty: "Water Main / Excavation", active: true },
  { id: "c2", name: "Nick Norman", specialty: "Water Main / Services", active: true },
  { id: "c3", name: "Crew 3", specialty: "General", active: true },
];

const starterProjects = [
  { id: "p1", code: "WS-742", name: "Water Main Replacement" },
  { id: "p2", code: "WS-743", name: "Water Main Replacement" },
];

const statusOptions = ["Assigned", "Requested", "Tentative", "No Crew Needed", "Off"];

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(ymd(today));
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
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [message, setMessage] = useState("");
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

  async function addCrew(e) {
    e.preventDefault();
    if (!newCrewName.trim()) return;

    const row = { name: newCrewName.trim(), specialty: newCrewSpecialty.trim(), active: true };
    if (supabase) {
      const { data, error } = await supabase.from("crews").insert(row).select().single();
      if (error) return flash(error.message);
      setCrews([...crews, data].sort((a,b)=>a.name.localeCompare(b.name)));
    } else {
      const data = { id: crypto.randomUUID(), ...row };
      const next = [...crews, data].sort((a,b)=>a.name.localeCompare(b.name));
      setCrews(next);
      saveLocal(next, projects, assignments);
    }
    setNewCrewName("");
    setNewCrewSpecialty("");
    flash("Crew added.");
  }

  async function addProject(e) {
    e.preventDefault();
    if (!newProjectCode.trim()) return;

    const row = { code: newProjectCode.trim().toUpperCase(), name: newProjectName.trim() };
    if (supabase) {
      const { data, error } = await supabase.from("projects").insert(row).select().single();
      if (error) return flash(error.message);
      setProjects([...projects, data].sort((a,b)=>a.code.localeCompare(b.code)));
    } else {
      const data = { id: crypto.randomUUID(), ...row };
      const next = [...projects, data].sort((a,b)=>a.code.localeCompare(b.code));
      setProjects(next);
      saveLocal(crews, next, assignments);
    }
    setNewProjectCode("");
    setNewProjectName("");
    flash("Project added.");
  }

  async function createAssignment(e) {
    e.preventDefault();

    if (status !== "No Crew Needed" && !crewId) return flash("Please select a crew.");
    if (!engineer.trim()) return flash("Please enter engineer name.");

    if (crewId && ["Assigned", "Requested", "Tentative"].includes(status)) {
      const conflict = assignments.find(
        (a) =>
          String(a.crew_id) === String(crewId) &&
          a.work_date === selectedDate &&
          ["Assigned", "Requested", "Tentative"].includes(a.status)
      );
      if (conflict) {
        const c = crews.find(x => String(x.id) === String(crewId));
        return flash(`${c?.name || "This crew"} already has an assignment on this date.`);
      }
    }

    const row = {
      work_date: selectedDate,
      engineer: engineer.trim(),
      crew_id: crewId || null,
      project_id: projectId || null,
      location: location.trim(),
      work_type: workType.trim(),
      status,
      notes: notes.trim(),
    };

    if (supabase) {
      const { data, error } = await supabase.from("assignments").insert(row).select().single();
      if (error) return flash(error.message);
      setAssignments([...assignments, data]);
    } else {
      const data = { id: crypto.randomUUID(), ...row };
      const next = [...assignments, data];
      setAssignments(next);
      saveLocal(crews, projects, next);
    }

    setCrewId("");
    setProjectId("");
    setLocation("");
    setWorkType("");
    setNotes("");
    setStatus("Assigned");
    flash("Assignment saved.");
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

  const assignmentFor = (crewId, date) =>
    assignments.find((a) => String(a.crew_id) === String(crewId) && a.work_date === date);

  const dateAssignments = assignments.filter((a) => a.work_date === selectedDate);
  const busyCrewIds = new Set(
    dateAssignments.filter(a => a.crew_id && a.status !== "Off").map((a) => String(a.crew_id))
  );
  const availableCrews = crews.filter((c) => c.active !== false && !busyCrewIds.has(String(c.id)));

  const projectName = (id) => {
    const p = projects.find((x) => String(x.id) === String(id));
    return p ? p.code : "—";
  };

  const crewName = (id) => {
    const c = crews.find((x) => String(x.id) === String(id));
    return c ? c.name : "No Crew";
  };

  const tabButtons = [
    ["dashboard", "Dashboard"],
    ["assign", "Assign Crew"],
    ["availability", "Availability"],
    ["crews", "Crews"],
    ["projects", "Projects"],
  ];

  return (
    <main>
      <header className="topbar">
        <div>
          <div className="brand">CREW PLANNER</div>
          <div className="sub">Simple crew availability & scheduling</div>
        </div>
        <div className={`mode ${dbMode ? "live" : ""}`}>
          {dbMode ? "Shared Database" : "Demo / Local Mode"}
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
                          {projectName(a.project_id)} {a.location ? `• ${a.location}` : ""}
                        </div>
                        <small>{a.engineer} • {a.status}</small>
                      </div>
                      <button className="delete" onClick={() => deleteAssignment(a.id)}>Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">3-Day Look Ahead</div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Crew</th>
                      {[0,1,2].map(n => <th key={n}>{fmt(addDays(new Date(selectedDate+"T12:00:00"),n))}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {crews.filter(c=>c.active!==false).map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        {[0,1,2].map(n => {
                          const date = ymd(addDays(new Date(selectedDate+"T12:00:00"),n));
                          const a = assignmentFor(c.id, date);
                          return (
                            <td key={n}>
                              {a ? (
                                <div className="cellBusy">
                                  <b>{a.status}</b>
                                  <span>{projectName(a.project_id)}</span>
                                  <small>{a.location || a.engineer}</small>
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
          </>
        ) : activeTab === "assign" ? (
          <>
            <div className="pageHead">
              <div><h1>Assign Crew</h1><p>One simple form for daily scheduling.</p></div>
            </div>
            <form className="card form" onSubmit={createAssignment}>
              <div className="formGrid">
                <label>
                  Date
                  <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} required />
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
                    <div><strong>{c.name}</strong><small>{c.specialty || "General"}</small></div>
                    <button className="smallBtn" onClick={()=>{setCrewId(String(c.id)); setActiveTab("assign")}}>Assign</button>
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
              <form className="card form" onSubmit={addCrew}>
                <div className="cardTitle">Add Crew</div>
                <label>Foreman / Crew Name<input value={newCrewName} onChange={e=>setNewCrewName(e.target.value)} placeholder="Example: Aaron Tillman" /></label>
                <label>Specialty<input value={newCrewSpecialty} onChange={e=>setNewCrewSpecialty(e.target.value)} placeholder="Example: Water Main / Services" /></label>
                <button className="primary" type="submit">Add Crew</button>
              </form>
              <div className="card">
                <div className="cardTitle">Crew List</div>
                {crews.map(c=><div className="crewRow" key={c.id}><div className="dot"></div><div><strong>{c.name}</strong><small>{c.specialty || "General"}</small></div></div>)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="pageHead"><div><h1>Projects</h1><p>Add the projects engineers can select.</p></div></div>
            <div className="grid2">
              <form className="card form" onSubmit={addProject}>
                <div className="cardTitle">Add Project</div>
                <label>Project Code<input value={newProjectCode} onChange={e=>setNewProjectCode(e.target.value)} placeholder="Example: WS-742" /></label>
                <label>Project Name<input value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} placeholder="Example: Water Main Replacement" /></label>
                <button className="primary" type="submit">Add Project</button>
              </form>
              <div className="card">
                <div className="cardTitle">Project List</div>
                {projects.map(p=><div className="projectRow" key={p.id}><strong>{p.code}</strong><span>{p.name || "—"}</span></div>)}
              </div>
            </div>
          </>
        )}
      </section>

      <footer>
        Crew Planner • Simple scheduling for field teams
      </footer>
    </main>
  );
}
