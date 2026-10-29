
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const KEYS = {
    session: "TIT_DEMO_SESSION",
    candidates: "TIT_CANDIDATES",
    accepted: "TIT_INSTRUCTIONS_ACCEPTED",
    activeExam: "TIT_ACTIVE_EXAM",
    results: "TIT_EXAM_RESULTS"
  };

  const EXAM_DURATION_SECONDS = 60 * 60;
  const TOTAL_QUESTIONS = 40;

  const pageError = document.getElementById("pageError");
  const examSection = document.getElementById("examSection");
  const resultSection = document.getElementById("resultSection");

  const timerValue = document.getElementById("timerValue");
  const questionNumber = document.getElementById("questionNumber");
  const questionCount = document.getElementById("questionCount");
  const questionText = document.getElementById("questionText");
  const optionsContainer = document.getElementById("optionsContainer");
  const questionPalette = document.getElementById("questionPalette");

  const previousButton = document.getElementById("previousButton");
  const nextButton = document.getElementById("nextButton");
  const clearButton = document.getElementById("clearButton");
  const submitButton = document.getElementById("submitButton");

  let candidate = null;
  let questions = [];
  let answers = [];
  let currentIndex = 0;
  let endTime = 0;
  let startedAt = 0;
  let timerInterval = null;
  let submitted = false;

  function showPageError(message) {
    pageError.textContent = message;
    pageError.hidden = false;
    examSection.hidden = true;
  }

  function readCandidates() {
    const value = JSON.parse(
      localStorage.getItem(KEYS.candidates) || "[]"
    );

    if (!Array.isArray(value)) {
      throw new Error("Candidate database is invalid.");
    }

    return value;
  }

  function saveCandidates(candidates) {
    localStorage.setItem(KEYS.candidates, JSON.stringify(candidates));
  }

  function updateCandidateStatus(status) {
    const candidates = readCandidates();
    const index = candidates.findIndex(function (item) {
      return item &&
        item.registrationNumber === candidate.registrationNumber;
    });

    if (index < 0) {
      throw new Error("Candidate registration not found.");
    }

    candidates[index].examStatus = status;
    saveCandidates(candidates);
    candidate = candidates[index];
  }

  function saveActiveExam() {
    sessionStorage.setItem(KEYS.activeExam, JSON.stringify({
      registrationNumber: candidate.registrationNumber,
      answers: answers,
      currentIndex: currentIndex,
      startedAt: startedAt,
      endTime: endTime
    }));
  }

  function loadActiveExam() {
    const raw = sessionStorage.getItem(KEYS.activeExam);

    if (!raw) return null;

    const state = JSON.parse(raw);

    if (
      !state ||
      state.registrationNumber !== candidate.registrationNumber ||
      !Array.isArray(state.answers) ||
      state.answers.length !== TOTAL_QUESTIONS ||
      !Number.isFinite(state.endTime) ||
      !Number.isFinite(state.startedAt)
    ) {
      return null;
    }

    return state;
  }

  function escapeSafeText(element, value) {
    // textContent treats values as text, not executable HTML.
    element.textContent =
      typeof value === "string" ? value : String(value ?? "");
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(remainingSeconds).padStart(2, "0")
    );
  }

  function showQuestion() {
    const question = questions[currentIndex];

    questionNumber.textContent =
      "QUESTION " + String(currentIndex + 1).padStart(2, "0");

    questionCount.textContent =
      (currentIndex + 1) + " of " + questions.length;

    escapeSafeText(questionText, question[0]);
    optionsContainer.replaceChildren();

    for (let i = 0; i < 4; i++) {
      const label = document.createElement("label");
      label.className = "option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "questionAnswer";
      input.value = String(i);
      input.checked = answers[currentIndex] === i;
      input.setAttribute(
        "aria-label",
        "Option " + String.fromCharCode(65 + i)
      );

      input.addEventListener("change", function () {
        answers[currentIndex] = i;
        saveActiveExam();
        renderPalette();
      });

      const text = document.createElement("span");
      text.textContent =
        String.fromCharCode(65 + i) + ". " + question[i + 1];

      label.append(input, text);
      optionsContainer.appendChild(label);
    }

    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === questions.length - 1;

    renderPalette();
  }

  function renderPalette() {
    questionPalette.replaceChildren();

    questions.forEach(function (_, index) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "q-number";

      if (index === currentIndex) {
        button.classList.add("current");
      }

      if (answers[index] !== null) {
        button.classList.add("answered");
      }

      button.textContent = String(index + 1);
      button.setAttribute(
        "aria-label",
        "Question " + (index + 1) +
        (answers[index] !== null ? ", answered" : ", unanswered")
      );

      button.addEventListener("click", function () {
        currentIndex = index;
        saveActiveExam();
        showQuestion();
      });

      questionPalette.appendChild(button);
    });
  }

  function updateTimer() {
    const remaining = Math.ceil((endTime - Date.now()) / 1000);

    timerValue.textContent = formatTime(remaining);

    if (remaining <= 300) {
      timerValue.style.color = "#ffdddd";
    }

    if (remaining <= 0) {
      finishExam(true);
    }
  }

  function getSavedResults() {
    const raw = localStorage.getItem(KEYS.results);
    const value = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(value)) {
      throw new Error("Result records are invalid.");
    }

    return value;
  }

  function finishExam(autoSubmitted) {
    if (submitted) return;

    if (!autoSubmitted) {
      const confirmed = window.confirm(
        "Are you sure you want to submit the examination now? " +
        "You cannot change your answers after submission."
      );

      if (!confirmed) return;
    }

    submitted = true;

    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    // Score only the answer choices that match the answer key.
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    questions.forEach(function (question, index) {
      if (answers[index] === null) {
        unanswered++;
      } else if (answers[index] === question[5]) {
        correct++;
      } else {
        wrong++;
      }
    });

    const score = correct;
    const percentage = (score / questions.length) * 100;
    const timeUsed = Math.min(
      EXAM_DURATION_SECONDS,
      Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    );

    const result = {
      registrationNumber: candidate.registrationNumber,
      candidateName: candidate.candidateName,
      fatherName: candidate.fatherName,
      candidateClass: candidate.candidateClass,
      examDate: new Date().toISOString(),
      startedAt: new Date(startedAt).toISOString(),
      submittedAt: new Date().toISOString(),
      totalQuestions: questions.length,
      correct: correct,
      wrong: wrong,
      unanswered: unanswered,
      score: score,
      maximumMarks: questions.length,
      percentage: Number(percentage.toFixed(2)),
      timeUsedSeconds: timeUsed,
      autoSubmitted: Boolean(autoSubmitted),
      answers: answers.slice()
    };

    try {
      const results = getSavedResults();

      // Replace any previous demo result for this registration.
      const existingIndex = results.findIndex(function (item) {
        return item &&
          item.registrationNumber === candidate.registrationNumber;
      });

      if (existingIndex >= 0) {
        results[existingIndex] = result;
      } else {
        results.push(result);
      }

      localStorage.setItem(KEYS.results, JSON.stringify(results));
      updateCandidateStatus("COMPLETED");

      // Remove the active attempt after recording the result.
      sessionStorage.removeItem(KEYS.activeExam);
      sessionStorage.removeItem(KEYS.accepted);

    } catch (error) {
      console.error("Unable to save the demo exam result.");

      // Keep the result visible even if browser storage fails.
      showPageError(
        "The result could not be saved to browser storage. " +
        "Please record the displayed result and contact the administrator."
      );
    }

    examSection.hidden = true;
    resultSection.hidden = false;

    document.getElementById("resultMessage").textContent =
      autoSubmitted
        ? "Time expired. Your examination was automatically submitted."
        : "Your examination has been submitted successfully.";

    document.getElementById("resultScore").textContent =
      score + " / " + questions.length;

    document.getElementById("resultPercentage").textContent =
      percentage.toFixed(2) + "%";

    document.getElementById("resultCorrect").textContent = String(correct);
    document.getElementById("resultWrong").textContent = String(wrong);
    document.getElementById("resultUnanswered").textContent =
      String(unanswered);

    document.getElementById("resultTime").textContent =
      formatTime(timeUsed);

    timerValue.textContent = "00:00";
  }

  // 1. Validate the candidate's login session.
  try {
    const registrationNumber = sessionStorage.getItem(KEYS.session);
    const acceptedRegistration = sessionStorage.getItem(KEYS.accepted);

    if (!registrationNumber || acceptedRegistration !== registrationNumber) {
      showPageError(
        "Your verified session or instruction confirmation is missing. " +
        "Please log in again and follow the exam steps."
      );
      return;
    }

    const candidates = readCandidates();

    candidate = candidates.find(function (item) {
      return item &&
        item.registrationNumber === registrationNumber;
    });

    if (!candidate) {
      showPageError("Candidate registration was not found. Please log in again.");
      return;
    }

    if (candidate.examStatus === "COMPLETED") {
      showPageError(
        "An examination result is already recorded for this registration. " +
        "A second attempt is not available in this demo."
      );
      return;
    }

    const bank = window.TIT_QUESTION_BANK || {};
    const classBank = bank[candidate.candidateClass];

    if (!Array.isArray(classBank) || classBank.length < TOTAL_QUESTIONS) {
      showPageError(
        "The question bank for your class does not contain enough questions. " +
        "Please contact the examination administrator."
      );
      return;
    }

    // Validate all 40 questions and their four options.
    questions = classBank.slice(0, TOTAL_QUESTIONS);

    const validBank = questions.every(function (question) {
      return (
        Array.isArray(question) &&
        question.length >= 6 &&
        question.slice(0, 5).every(function (value) {
          return typeof value === "string" && value.length > 0;
        }) &&
        Number.isInteger(question[5]) &&
        question[5] >= 0 &&
        question[5] <= 3
      );
    });

    if (!validBank) {
      showPageError("The question bank contains an invalid question.");
      return;
    }

    const savedState = loadActiveExam();

    if (candidate.examStatus === "IN_PROGRESS" && !savedState) {
      showPageError(
        "An attempt is marked in progress, but its active session is unavailable. " +
        "Please contact the examination administrator."
      );
      return;
    }

    if (savedState) {
      answers = savedState.answers;
      currentIndex = Math.min(
        TOTAL_QUESTIONS - 1,
        Math.max(0, savedState.currentIndex)
      );
      startedAt = savedState.startedAt;
      endTime = savedState.endTime;
    } else {
      // Start a new attempt and establish the deadline immediately.
      answers = Array(TOTAL_QUESTIONS).fill(null);
      currentIndex = 0;
      startedAt = Date.now();
      endTime = startedAt + EXAM_DURATION_SECONDS * 1000;

      updateCandidateStatus("IN_PROGRESS");
      saveActiveExam();
    }

    document.getElementById("candidateName").textContent =
      candidate.candidateName || "Not available";

    document.getElementById("registrationNumber").textContent =
      candidate.registrationNumber;

    document.getElementById("candidateClass").textContent =
      candidate.candidateClass || "Not available";

    examSection.hidden = false;
    showQuestion();
    updateTimer();

    timerInterval = setInterval(updateTimer, 1000);

    previousButton.addEventListener("click", function () {
      if (currentIndex > 0) {
        currentIndex--;
        saveActiveExam();
        showQuestion();
      }
    });

    nextButton.addEventListener("click", function () {
      if (currentIndex < questions.length - 1) {
        currentIndex++;
        saveActiveExam();
        showQuestion();
      }
    });

    clearButton.addEventListener("click", function () {
      answers[currentIndex] = null;
      saveActiveExam();
      showQuestion();
    });

    submitButton.addEventListener("click", function () {
      finishExam(false);
    });

  } catch (error) {
    console.error("The examination could not be started.");
    showPageError(
      "Unable to load the examination. Check your registration and question bank."
    );
  }
});
