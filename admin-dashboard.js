
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const ADMIN_SESSION_KEY = "TIT_ADMIN_DEMO_SESSION";
  const CANDIDATES_KEY = "TIT_CANDIDATES";
  const RESULTS_KEY = "TIT_EXAM_RESULTS";

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== "active") {
    window.location.replace("admin-login.html");
    return;
  }

  const candidateBody = document.getElementById("candidateTableBody");
  const resultBody = document.getElementById("resultTableBody");

  let candidates = [];
  let results = [];

  document.getElementById("currentYear").textContent =
    String(new Date().getFullYear());

  function readArray(key) {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      throw new Error("Stored data is not a valid list.");
    }

    return data;
  }

  function createCell(value) {
    const td = document.createElement("td");

    // Never interpret candidate-provided data as HTML.
    td.textContent =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value);

    return td;
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN");
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-IN");
  }

  function formatDuration(seconds) {
    const value = Number(seconds);

    if (!Number.isFinite(value) || value < 0) return "—";

    const total = Math.floor(value);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) {
      return (
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(secs).padStart(2, "0")
      );
    }

    return (
      String(minutes).padStart(2, "0") + ":" +
      String(secs).padStart(2, "0")
    );
  }

  function normaliseStatus(value) {
    const status = String(value || "NOT_ATTEMPTED").toUpperCase();

    if (status === "COMPLETED") return "COMPLETED";
    if (status === "IN_PROGRESS") return "IN_PROGRESS";

    return "NOT_ATTEMPTED";
  }

  function createStatusCell(statusValue) {
    const td = document.createElement("td");
    const badge = document.createElement("span");
    const status = normaliseStatus(statusValue);

    badge.className = "status";

    if (status === "COMPLETED") {
      badge.classList.add("status-completed");
      badge.textContent = "COMPLETED";
    } else if (status === "IN_PROGRESS") {
      badge.classList.add("status-progress");
      badge.textContent = "IN PROGRESS";
    } else {
      badge.classList.add("status-not-attempted");
      badge.textContent = "NOT ATTEMPTED";
    }

    td.appendChild(badge);
    return td;
  }

  function matchesSearch(item, query) {
    if (!query) return true;

    const searchable = [
      item.registrationNumber,
      item.candidateName,
      item.fatherName
    ].map(function (value) {
      return String(value || "").toLowerCase();
    });

    return searchable.some(function (value) {
      return value.includes(query);
    });
  }

  function renderStatistics() {
    document.getElementById("totalCandidates").textContent =
      String(candidates.length);

    let completed = 0;
    let inProgress = 0;
    let notAttempted = 0;

    candidates.forEach(function (candidate) {
      const status = normaliseStatus(candidate.examStatus);

      if (status === "COMPLETED") {
        completed++;
      } else if (status === "IN_PROGRESS") {
        inProgress++;
      } else {
        notAttempted++;
      }
    });

    document.getElementById("completedExams").textContent =
      String(completed);

    document.getElementById("inProgressExams").textContent =
      String(inProgress);

    document.getElementById("notAttemptedExams").textContent =
      String(notAttempted);
  }

  function renderCandidates() {
    const query = document.getElementById("candidateSearch")
      .value.trim().toLowerCase();

    const selectedClass = document.getElementById("candidateClassFilter")
      .value;

    const filtered = candidates.filter(function (candidate) {
      const classMatches =
        !selectedClass || candidate.candidateClass === selectedClass;

      return classMatches && matchesSearch(candidate, query);
    });

    candidateBody.replaceChildren();

    filtered.forEach(function (candidate) {
      const tr = document.createElement("tr");

      tr.append(
        createCell(candidate.registrationNumber),
        createCell(candidate.candidateName),
        createCell(candidate.fatherName),
        createCell(candidate.candidateClass),
        createCell(candidate.mobileNumber),
        createCell(formatDate(candidate.dob)),
        createCell(formatDateTime(candidate.registrationDate)),
        createStatusCell(candidate.examStatus)
      );

      candidateBody.appendChild(tr);
    });

    document.getElementById("candidateEmpty").hidden =
      filtered.length !== 0;
  }

  function renderResults() {
    const query = document.getElementById("resultSearch")
      .value.trim().toLowerCase();

    const selectedClass = document.getElementById("resultClassFilter")
      .value;

    const filtered = results.filter(function (result) {
      const classMatches =
        !selectedClass || result.candidateClass === selectedClass;

      return classMatches && matchesSearch(result, query);
    });

    resultBody.replaceChildren();

    filtered.forEach(function (result) {
      const tr = document.createElement("tr");

      const score = Number(result.score);
      const maximumMarks = Number(result.maximumMarks);
      const percentage = Number(result.percentage);

      tr.append(
        createCell(result.registrationNumber),
        createCell(result.candidateName),
        createCell(result.candidateClass),
        createCell(
          Number.isFinite(score) && Number.isFinite(maximumMarks)
            ? score + " / " + maximumMarks
            : "—"
        ),
        createCell(
          Number.isFinite(percentage)
            ? percentage.toFixed(2) + "%"
            : "—"
        ),
        createCell(result.correct),
        createCell(result.wrong),
        createCell(result.unanswered),
        createCell(formatDuration(result.timeUsedSeconds)),
        createCell(formatDateTime(result.submittedAt || result.examDate)),
        createCell(result.autoSubmitted ? "AUTO-SUBMITTED" : "MANUAL")
      );

      resultBody.appendChild(tr);
    });

    document.getElementById("resultEmpty").hidden =
      filtered.length !== 0;
  }

  function refreshDashboard() {
    try {
      candidates = readArray(CANDIDATES_KEY);
      results = readArray(RESULTS_KEY);

      renderStatistics();
      renderCandidates();
      renderResults();
    } catch (error) {
      console.error("Could not load dashboard records.");

      window.alert(
        "Dashboard data could not be read. Please check the browser's stored data."
      );
    }
  }

  // Protect CSV files against common spreadsheet formula injection.
  function csvValue(value) {
    let text = String(value ?? "");

    if (/^[\s]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCSV(filename, headers, rows) {
    const lines = [headers, ...rows].map(function (row) {
      return row.map(csvValue).join(",");
    });

    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function exportCandidates() {
    const query = document.getElementById("candidateSearch")
      .value.trim().toLowerCase();

    const selectedClass = document.getElementById("candidateClassFilter")
      .value;

    const filtered = candidates.filter(function (candidate) {
      return (
        (!selectedClass || candidate.candidateClass === selectedClass) &&
        matchesSearch(candidate, query)
      );
    });

    const headers = [
      "Registration Number",
      "Candidate Name",
      "Father Name",
      "Class",
      "Mobile",
      "Date of Birth",
      "Registration Date",
      "Exam Status"
    ];

    const rows = filtered.map(function (candidate) {
      return [
        candidate.registrationNumber,
        candidate.candidateName,
        candidate.fatherName,
        candidate.candidateClass,
        candidate.mobileNumber,
        candidate.dob,
        candidate.registrationDate,
        normaliseStatus(candidate.examStatus)
      ];
    });

    downloadCSV("TIT_Candidates.csv", headers, rows);
  }

  function exportResults() {
    const query = document.getElementById("resultSearch")
      .value.trim().toLowerCase();

    const selectedClass = document.getElementById("resultClassFilter")
      .value;

    const filtered = results.filter(function (result) {
      return (
        (!selectedClass || result.candidateClass === selectedClass) &&
        matchesSearch(result, query)
      );
    });

    const headers = [
      "Registration Number",
      "Candidate Name",
      "Class",
      "Score",
      "Maximum Marks",
      "Percentage",
      "Correct",
      "Wrong",
      "Unanswered",
      "Time Used Seconds",
      "Started At",
      "Submitted At",
      "Auto Submitted"
    ];

    const rows = filtered.map(function (result) {
      return [
        result.registrationNumber,
        result.candidateName,
        result.candidateClass,
        result.score,
        result.maximumMarks,
        result.percentage,
        result.correct,
        result.wrong,
        result.unanswered,
        result.timeUsedSeconds,
        result.startedAt,
        result.submittedAt,
        Boolean(result.autoSubmitted)
      ];
    });

    downloadCSV("TIT_Exam_Results.csv", headers, rows);
  }

  document.getElementById("candidateSearch")
    .addEventListener("input", renderCandidates);

  document.getElementById("candidateClassFilter")
    .addEventListener("change", renderCandidates);

  document.getElementById("resultSearch")
    .addEventListener("input", renderResults);

  document.getElementById("resultClassFilter")
    .addEventListener("change", renderResults);

  document.getElementById("exportCandidatesButton")
    .addEventListener("click", exportCandidates);

  document.getElementById("exportResultsButton")
    .addEventListener("click", exportResults);

  document.getElementById("refreshButton")
    .addEventListener("click", refreshDashboard);

  document.getElementById("logoutButton")
    .addEventListener("click", function () {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      window.location.replace("admin-login.html");
    });

  refreshDashboard();
});
