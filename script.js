const STORAGE_KEYS = {
  ideas: "novaidea.vault",
  stats: "novaidea.stats",
  settings: "novaidea.settings",
  prompt: "novaidea.prompt",
  lastBatch: "novaidea.lastBatch"
};

const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.7,
  quantityDefault: 5,
  spiceDefault: "balanced",
  reducedMotion: false,
  neonTheme: false
};

const DEFAULT_STATS = {
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: "",
  badges: [],
  powerUps: ["Reroll", "Enhance", "Mashup"]
};

const DAILY_CHALLENGES = [
  "Generate 10 ideas in a new domain.",
  "Save 2 Hard difficulty ideas.",
  "Use Prompt Builder and generate 5 ideas.",
  "Collect 20 XP from swipes.",
  "Create an idea with a new monetization model."
];

const IDEA_TEMPLATES = [
  "AI-powered concierge for",
  "Smart automation layer for",
  "Community-driven marketplace for",
  "Personalized analytics dashboard for",
  "Gamified habit builder for",
  "Live collaboration studio for"
];

const PLATFORM_OPTIONS = ["Web", "Mobile", "Desktop", "Browser extension", "CLI", "AI agent", "API only"];
const MONETIZATION_OPTIONS = ["Free", "Freemium", "Subscription", "Usage-based", "Ads", "Internal ROI"];
const DIFFICULTY_OPTIONS = ["1", "2", "3", "4", "5"];

const appState = {
  ideas: [],
  deck: [],
  vault: [],
  settings: { ...DEFAULT_SETTINGS },
  stats: { ...DEFAULT_STATS },
  dailyChallenge: "",
  wizardStep: 0,
  wizardAnswers: {},
  lastBatch: null
};

const el = (id) => document.getElementById(id);

const navButtons = document.querySelectorAll(".nav__link");
const views = document.querySelectorAll(".view");

const wizardSteps = [
  {
    title: "Interests & Domains",
    fields: [
      { id: "domains", label: "Domains", type: "chips", options: ["Productivity", "Fintech", "Health", "Education", "Creator economy", "Climate", "Gaming", "AI tools"] },
      { id: "customDomain", label: "Custom domain", type: "text", placeholder: "Add your own domain" }
    ]
  },
  {
    title: "Platform",
    fields: [
      { id: "platform", label: "Target platform", type: "select", options: PLATFORM_OPTIONS }
    ]
  },
  {
    title: "Target User",
    fields: [
      { id: "audience", label: "Primary users", type: "select", options: ["Consumers", "SMB", "Enterprise", "Internal tool", "Creators", "Students"] },
      { id: "userNeeds", label: "What do they need?", type: "textarea", placeholder: "Speed, clarity, automation, outcomes..." }
    ]
  },
  {
    title: "Constraints",
    fields: [
      { id: "mvpTime", label: "Time to MVP", type: "select", options: ["Weekend", "2 weeks", "1 month", "3 months"] },
      { id: "skillLevel", label: "Skill level", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
      { id: "techConstraints", label: "Must-use tech", type: "text", placeholder: "e.g. Supabase, Stripe, React" }
    ]
  },
  {
    title: "Monetization",
    fields: [
      { id: "monetization", label: "Business model", type: "select", options: MONETIZATION_OPTIONS },
      { id: "pricingNotes", label: "Pricing notes", type: "text", placeholder: "Starter/free tier, team plan, etc." }
    ]
  },
  {
    title: "Vibe",
    fields: [
      { id: "vibe", label: "Product vibe", type: "select", options: ["Serious", "Playful", "Futuristic", "Minimalist"] },
      { id: "brandNotes", label: "Brand notes", type: "textarea", placeholder: "Tone, visuals, brand personality" }
    ]
  },
  {
    title: "Differentiators",
    fields: [
      { id: "differentiators", label: "Unique twist", type: "textarea", placeholder: "What makes this not another clone?" }
    ]
  },
  {
    title: "Review & Prompt",
    fields: [
      { id: "finalPrompt", label: "Polished prompt", type: "review" }
    ]
  }
];

const buildPromptTemplate = (idea) => {
  return `You are an expert product engineer. Build the following app idea as a production-ready product.\n\nApp Overview\n- Title: ${idea.title}\n- One-liner: ${idea.oneLiner}\n- Target users: ${idea.problem.targetUsers}\n- Problem: ${idea.problem.summary}\n\nCore User Stories\n- ${idea.userStories.join("\n- ")}\n\nRecommended Tech Stack\n- Primary: ${idea.stack.primary}\n- Alternative: ${idea.stack.alternative}\n\nData Model Outline\n${idea.dataModel.map((entry) => `- ${entry}`).join("\n")}\n\nAPI Routes / Services\n${idea.apiRoutes.map((entry) => `- ${entry}`).join("\n")}\n\nUI Pages & Components\n${idea.ui.map((entry) => `- ${entry}`).join("\n")}\n\nMilestones\n${idea.milestones.map((entry) => `- ${entry}`).join("\n")}\n\nNon-functional Requirements\n${idea.requirements.map((entry) => `- ${entry}`).join("\n")}\n\nTesting Plan\n${idea.testing.map((entry) => `- ${entry}`).join("\n")}\n\nDeliverables\n- README with setup\n- .env.example\n- Scripts for dev/build/test`;
};

const levelForXp = (xp) => {
  let level = 1;
  while (xp >= xpNeededForLevel(level + 1)) {
    level += 1;
  }
  return level;
};

const xpNeededForLevel = (level) => Math.pow(level, 2) * 50;

const updateStreak = () => {
  const today = new Date().toISOString().split("T")[0];
  if (!appState.stats.lastActiveDate) {
    appState.stats.lastActiveDate = today;
    appState.stats.streak = 1;
    return;
  }
  if (appState.stats.lastActiveDate === today) {
    return;
  }
  const last = new Date(appState.stats.lastActiveDate);
  const diffDays = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) {
    appState.stats.streak += 1;
  } else {
    appState.stats.streak = 1;
  }
  appState.stats.lastActiveDate = today;
};

const addXp = (amount, reason = "") => {
  const previousLevel = appState.stats.level;
  appState.stats.xp += amount;
  appState.stats.level = levelForXp(appState.stats.xp);
  if (appState.stats.level > previousLevel) {
    showLevelUp(appState.stats.level);
    addBadge(`Level ${appState.stats.level}`);
  }
  updateStatsUI(reason);
};

const addBadge = (label) => {
  if (!appState.stats.badges.includes(label)) {
    appState.stats.badges.push(label);
  }
};

const showToast = (message) => {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
};

const showLevelUp = (level) => {
  const modal = el("levelUpModal");
  el("levelUpText").textContent = `You reached level ${level}.`;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};

const showPowerUp = (message) => {
  const modal = el("powerUpModal");
  el("powerUpText").textContent = message;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};

const setView = (viewId) => {
  views.forEach((view) => view.classList.remove("view--active"));
  const target = el(viewId);
  if (target) {
    target.classList.add("view--active");
  }
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
};

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

const initializeSettings = () => {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "null");
  appState.settings = stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
  el("apiKey").value = appState.settings.apiKey;
  el("modelName").value = appState.settings.model;
  el("temperature").value = appState.settings.temperature;
  el("temperatureValue").textContent = appState.settings.temperature;
  el("defaultQuantity").value = appState.settings.quantityDefault;
  el("defaultSpice").value = appState.settings.spiceDefault;
  el("reducedMotion").checked = appState.settings.reducedMotion;
  el("neonTheme").checked = appState.settings.neonTheme;
  document.body.classList.toggle("neon", appState.settings.neonTheme);
};

const saveSettings = () => {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appState.settings));
};

const initializeStats = () => {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || "null");
  appState.stats = stored ? { ...DEFAULT_STATS, ...stored } : { ...DEFAULT_STATS };
  updateStreak();
  updateStatsUI();
};

const saveStats = () => {
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(appState.stats));
};

const updateStatsUI = () => {
  const { xp, level, streak, badges, powerUps } = appState.stats;
  const nextLevelXp = xpNeededForLevel(level + 1);
  const prevLevelXp = xpNeededForLevel(level);
  const progress = (xp - prevLevelXp) / (nextLevelXp - prevLevelXp);
  el("levelBadge").textContent = `Level ${level}`;
  el("xpValue").textContent = `${xp} XP`;
  el("xpFill").style.width = `${Math.min(progress * 100, 100)}%`;
  el("levelProgressLabel").textContent = `Level ${level} · ${xp - prevLevelXp} / ${nextLevelXp - prevLevelXp} XP`;
  el("levelProgressFill").style.width = `${Math.min(progress * 100, 100)}%`;
  el("streakValue").textContent = `${streak} days`;
  el("powerUpCount").textContent = powerUps.length;
  el("badgeList").innerHTML = badges.length ? badges.map((badge) => `<span class="badge">${badge}</span>`).join("") : "<span class=\"muted\">No badges yet.</span>";
  saveStats();
};

const initializeDailyChallenge = () => {
  const today = new Date().toISOString().split("T")[0];
  const stored = localStorage.getItem("novaidea.challenge");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.date === today) {
      appState.dailyChallenge = parsed.challenge;
    }
  }
  if (!appState.dailyChallenge) {
    appState.dailyChallenge = DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)];
    localStorage.setItem("novaidea.challenge", JSON.stringify({ date: today, challenge: appState.dailyChallenge }));
  }
  el("dailyChallenge").textContent = appState.dailyChallenge;
};

const initializeVault = () => {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.ideas) || "[]");
  appState.vault = stored;
  updateVaultUI();
};

const saveVault = () => {
  localStorage.setItem(STORAGE_KEYS.ideas, JSON.stringify(appState.vault));
};

const getWizardPrompt = () => {
  const answer = appState.wizardAnswers;
  const domains = [...(answer.domains || []), answer.customDomain].filter(Boolean).join(", ");
  return `Generate a novel software/app idea with a unique twist.\n\nDomains: ${domains || "Open to any"}\nPlatform: ${answer.platform || "Any"}\nTarget users: ${answer.audience || "Any"}\nUser needs: ${answer.userNeeds || ""}\nConstraints: ${answer.mvpTime || "Flexible"}, Skill level ${answer.skillLevel || "Any"}, Must use ${answer.techConstraints || "Any"}\nMonetization: ${answer.monetization || "Any"} ${answer.pricingNotes || ""}\nVibe: ${answer.vibe || "Any"} ${answer.brandNotes || ""}\nDifferentiators: ${answer.differentiators || "Must include a unique twist"}\n\nOutput should be detailed, feasible, and formatted with clear sections.`;
};

const buildWizard = () => {
  const stepsContainer = el("wizardSteps");
  const progressContainer = el("wizardProgress");
  stepsContainer.innerHTML = "";
  progressContainer.innerHTML = "";
  wizardSteps.forEach((step, index) => {
    const stepEl = document.createElement("div");
    stepEl.className = `wizard__step ${index === appState.wizardStep ? "active" : ""}`;
    stepEl.textContent = `${index + 1}. ${step.title}`;
    stepEl.addEventListener("click", () => {
      appState.wizardStep = index;
      renderWizardPanel();
    });
    stepsContainer.appendChild(stepEl);

    const dot = document.createElement("span");
    dot.className = `pill ${index === appState.wizardStep ? "" : "muted"}`;
    dot.textContent = index + 1;
    progressContainer.appendChild(dot);
  });
};

const renderWizardPanel = () => {
  buildWizard();
  const panel = el("wizardPanel");
  const step = wizardSteps[appState.wizardStep];
  panel.innerHTML = `<h3>${step.title}</h3>`;

  step.fields.forEach((field) => {
    if (field.type === "chips") {
      const wrapper = document.createElement("div");
      wrapper.className = "field";
      wrapper.innerHTML = `<span>${field.label}</span>`;
      const chipGrid = document.createElement("div");
      chipGrid.className = "chip-grid";
      const selected = appState.wizardAnswers[field.id] || [];
      field.options.forEach((option) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `chip ${selected.includes(option) ? "active" : ""}`;
        chip.textContent = option;
        chip.addEventListener("click", () => {
          const list = new Set(appState.wizardAnswers[field.id] || []);
          if (list.has(option)) {
            list.delete(option);
          } else {
            list.add(option);
          }
          appState.wizardAnswers[field.id] = Array.from(list);
          renderWizardPanel();
        });
        chipGrid.appendChild(chip);
      });
      wrapper.appendChild(chipGrid);
      panel.appendChild(wrapper);
      return;
    }

    if (field.type === "review") {
      const prompt = getWizardPrompt();
      const summary = document.createElement("div");
      summary.className = "idea-card__section";
      summary.innerHTML = `<h4>Preview</h4><p>${prompt.replace(/\n/g, "<br>")}</p>`;
      panel.appendChild(summary);

      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.rows = 10;
      textarea.addEventListener("input", (event) => {
        appState.wizardAnswers.finalPrompt = event.target.value;
      });
      textarea.className = "idea-card__prompt";
      panel.appendChild(textarea);
      return;
    }

    const label = document.createElement("label");
    label.className = "field";
    const fieldId = field.id;
    label.innerHTML = `<span>${field.label}</span>`;
    if (field.type === "select") {
      const select = document.createElement("select");
      field.options.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
      });
      select.value = appState.wizardAnswers[fieldId] || field.options[0];
      select.addEventListener("change", (event) => {
        appState.wizardAnswers[fieldId] = event.target.value;
      });
      label.appendChild(select);
    } else if (field.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.rows = 4;
      textarea.placeholder = field.placeholder || "";
      textarea.value = appState.wizardAnswers[fieldId] || "";
      textarea.addEventListener("input", (event) => {
        appState.wizardAnswers[fieldId] = event.target.value;
      });
      label.appendChild(textarea);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = field.placeholder || "";
      input.value = appState.wizardAnswers[fieldId] || "";
      input.addEventListener("input", (event) => {
        appState.wizardAnswers[fieldId] = event.target.value;
      });
      label.appendChild(input);
    }
    panel.appendChild(label);
  });

  el("wizardPrev").disabled = appState.wizardStep === 0;
  el("wizardNext").textContent = appState.wizardStep === wizardSteps.length - 1 ? "Use prompt" : "Next";
};

const buildIdea = (prompt, spice) => {
  const base = IDEA_TEMPLATES[Math.floor(Math.random() * IDEA_TEMPLATES.length)];
  const platform = PLATFORM_OPTIONS[Math.floor(Math.random() * PLATFORM_OPTIONS.length)];
  const difficulty = DIFFICULTY_OPTIONS[Math.floor(Math.random() * DIFFICULTY_OPTIONS.length)];
  const monetization = MONETIZATION_OPTIONS[Math.floor(Math.random() * MONETIZATION_OPTIONS.length)];
  const twist = spice === "wild" ? "with an unexpected social mechanic" : spice === "safe" ? "with a proven, low-risk flow" : "with a subtle AI twist";
  const title = `${prompt.split(" ")[0] || "Nova"} ${platform} Studio`;
  const oneLiner = `${base} ${prompt || "founders"} ${twist}.`;
  const idea = {
    id: `idea_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title,
    oneLiner,
    tags: [prompt || "General", platform, monetization],
    platform,
    difficulty,
    timeToMvp: spice === "wild" ? "6-8 weeks" : "2-4 weeks",
    problem: {
      summary: `Teams struggle to translate ${prompt || "ideas"} into a clear, actionable roadmap.`,
      targetUsers: "Founders, product leads, and makers"
    },
    keyFeatures: {
      mvp: ["Guided prompt intake", "Idea scoring engine", "Swipeable idea deck", "Perfect Build Prompt output"],
      later: ["Team collaboration", "Trend-based idea refresh", "AI pitch deck builder"]
    },
    differentiators: ["Novel constraint-based ideation", "Gamified XP feedback", "Build prompt auto-generated"],
    stack: {
      primary: "Next.js + Tailwind + Prisma + SQLite",
      alternative: "Remix + Supabase + Postgres"
    },
    estimated: {
      difficulty: difficulty,
      timeToMvp: spice === "wild" ? "6-8 weeks" : "3-4 weeks"
    },
    monetization,
    risks: ["Ideas feel too generic", "Users want more customization"],
    mitigations: ["Add differentiator prompt guardrails", "Allow rapid prompt tweaks"],
    successMetrics: ["Generated ideas per user", "Save rate", "Prompt copy rate"],
    userStories: [
      "As a founder, I want to generate novel app ideas quickly.",
      "As a maker, I want a build-ready prompt I can paste into an AI coder.",
      "As a team, I want to save and organize ideas in a vault."
    ],
    dataModel: [
      "Idea: id, title, oneLiner, tags, platform, difficulty, timeToMvp, buildPrompt",
      "UserStats: xp, level, streak, badges, powerUps",
      "Settings: model, temperature, defaults, reducedMotion"
    ],
    apiRoutes: [
      "POST /api/ideas/generate",
      "POST /api/ideas/enhance",
      "POST /api/ideas/mashup",
      "GET /api/vault"
    ],
    ui: [
      "Home dashboard",
      "Prompt Builder wizard",
      "Swipe deck",
      "Vault grid",
      "Settings"
    ],
    milestones: [
      "Set up data models and state",
      "Build prompt builder flow",
      "Implement swipe deck + vault",
      "Add gamification + power-ups",
      "QA + polish"
    ],
    requirements: [
      "Accessible keyboard navigation",
      "Responsive design",
      "Secure API key handling",
      "Consistent JSON formatting"
    ],
    testing: [
      "Unit tests for XP and streak logic",
      "Unit tests for AI JSON validation",
      "E2E test for generate → swipe → save"
    ]
  };
  idea.buildPrompt = buildPromptTemplate(idea);
  return idea;
};

const generateIdeas = async () => {
  const prompt = el("basePrompt").value || appState.wizardAnswers.finalPrompt || getWizardPrompt();
  const quantity = parseInt(el("quantity").value, 10);
  const spice = el("spiceLevel").value;
  appState.deck = Array.from({ length: quantity }, () => buildIdea(prompt, spice));
  appState.lastBatch = { prompt, quantity, spice, timestamp: new Date().toLocaleString() };
  localStorage.setItem(STORAGE_KEYS.lastBatch, JSON.stringify(appState.lastBatch));
  renderDeck();
  addXp(10, "Generated ideas");
  updateLastBatch();
};

const renderDeck = () => {
  const deck = el("swipeDeck");
  deck.innerHTML = "";
  appState.deck.forEach((idea, index) => {
    const card = document.createElement("div");
    card.className = "idea-card";
    card.style.zIndex = `${appState.deck.length - index}`;
    card.innerHTML = `
      <div class="idea-card__header">
        <div>
          <p class="idea-card__title">${idea.title}</p>
          <p class="muted">${idea.oneLiner}</p>
        </div>
        <div class="idea-card__tags">
          ${idea.tags.map((tag) => `<span class="idea-card__tag">${tag}</span>`).join("")}
        </div>
      </div>
      <div class="idea-card__meta">
        <div class="idea-card__section">
          <h4>Problem</h4>
          <p>${idea.problem.summary}</p>
          <p class="muted">Target: ${idea.problem.targetUsers}</p>
        </div>
        <div class="idea-card__section">
          <h4>Key features</h4>
          <p><strong>MVP:</strong> ${idea.keyFeatures.mvp.join(", ")}</p>
          <p><strong>Later:</strong> ${idea.keyFeatures.later.join(", ")}</p>
        </div>
      </div>
      <div class="idea-card__meta">
        <div class="idea-card__section">
          <h4>Differentiators</h4>
          <p>${idea.differentiators.join(", ")}</p>
        </div>
        <div class="idea-card__section">
          <h4>Stack</h4>
          <p>${idea.stack.primary}</p>
          <p class="muted">Alt: ${idea.stack.alternative}</p>
        </div>
      </div>
      <div class="idea-card__meta">
        <div class="idea-card__section">
          <h4>Difficulty & Time</h4>
          <p>Difficulty: ${idea.estimated.difficulty}/5</p>
          <p>Time-to-MVP: ${idea.estimated.timeToMvp}</p>
        </div>
        <div class="idea-card__section">
          <h4>Monetization</h4>
          <p>${idea.monetization}</p>
        </div>
      </div>
      <div class="idea-card__section">
        <h4>Risks & Mitigations</h4>
        <p>${idea.risks.join(", ")}</p>
        <p class="muted">${idea.mitigations.join(" | ")}</p>
      </div>
      <div class="idea-card__section">
        <h4>Success metrics</h4>
        <p>${idea.successMetrics.join(", ")}</p>
      </div>
      <div class="idea-card__section">
        <h4>Perfect Build Prompt</h4>
        <div class="idea-card__prompt" id="prompt-${idea.id}">${idea.buildPrompt}</div>
        <div class="idea-card__actions">
          <button class="pill-btn" data-copy="${idea.id}">Copy prompt</button>
          <button class="pill-btn" data-expand="${idea.id}">Expand</button>
        </div>
      </div>
    `;
    deck.appendChild(card);
  });

  attachCardActions();
};

const attachCardActions = () => {
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ideaId = btn.dataset.copy;
      const idea = appState.deck.find((item) => item.id === ideaId) || appState.vault.find((item) => item.id === ideaId);
      if (idea) {
        navigator.clipboard.writeText(idea.buildPrompt);
        showToast("Prompt copied");
      }
    });
  });

  document.querySelectorAll("[data-expand]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ideaId = btn.dataset.expand;
      const card = document.querySelector(`#prompt-${ideaId}`);
      if (card) {
        card.classList.toggle("idea-card__prompt--expanded");
      }
    });
  });
};

const swipeCard = (direction) => {
  if (!appState.deck.length) return;
  const card = appState.deck.shift();
  if (direction === "save") {
    appState.vault.unshift(card);
    saveVault();
    addXp(5, "Saved idea");
    addBadge("First Save");
  } else {
    addXp(1, "Swipe");
  }
  renderDeck();
  updateVaultUI();
};

const updateVaultUI = () => {
  el("savedCount").textContent = appState.vault.length;
  const grid = el("vaultGrid");
  if (!grid) return;
  const query = el("vaultSearch").value?.toLowerCase() || "";
  const platformFilter = el("vaultPlatform").value || "all";
  const diffFilter = el("vaultDifficulty").value || "all";
  const monetizationFilter = el("vaultMonetization").value || "all";

  const filtered = appState.vault.filter((idea) => {
    const matchesQuery = idea.title.toLowerCase().includes(query) || idea.oneLiner.toLowerCase().includes(query);
    const matchesPlatform = platformFilter === "all" || idea.platform === platformFilter;
    const matchesDiff = diffFilter === "all" || idea.estimated.difficulty === diffFilter;
    const matchesMoney = monetizationFilter === "all" || idea.monetization === monetizationFilter;
    return matchesQuery && matchesPlatform && matchesDiff && matchesMoney;
  });

  grid.innerHTML = filtered.length
    ? filtered.map((idea) => `
      <div class="vault-card">
        <h4>${idea.title}</h4>
        <p class="muted">${idea.oneLiner}</p>
        <p><strong>Platform:</strong> ${idea.platform}</p>
        <p><strong>Difficulty:</strong> ${idea.estimated.difficulty}/5</p>
        <p><strong>Monetization:</strong> ${idea.monetization}</p>
        <button class="pill-btn" data-copy="${idea.id}">Copy Build Prompt</button>
      </div>
    `).join("")
    : `<p class="muted">No saved ideas yet. Swipe right to save.</p>`;

  attachCardActions();
  saveVault();
};

const updateLastBatch = () => {
  const batch = appState.lastBatch;
  if (!batch) {
    el("lastBatch").textContent = "";
    return;
  }
  el("lastBatch").textContent = `Last batch: ${batch.quantity} ideas · ${batch.spice} spice · ${batch.timestamp}`;
};

const exportVault = (type) => {
  if (!appState.vault.length) {
    showToast("Vault is empty");
    return;
  }
  let content = "";
  let filename = "novaidea-vault";
  if (type === "json") {
    content = JSON.stringify(appState.vault, null, 2);
    filename += ".json";
  } else {
    content = appState.vault
      .map((idea) => `# ${idea.title}\n${idea.oneLiner}\n\n## Perfect Build Prompt\n${idea.buildPrompt}\n`)
      .join("\n");
    filename += ".md";
  }
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const applySettings = () => {
  appState.settings.apiKey = el("apiKey").value.trim();
  appState.settings.model = el("modelName").value.trim() || DEFAULT_SETTINGS.model;
  appState.settings.temperature = parseFloat(el("temperature").value);
  appState.settings.quantityDefault = parseInt(el("defaultQuantity").value, 10);
  appState.settings.spiceDefault = el("defaultSpice").value;
  appState.settings.reducedMotion = el("reducedMotion").checked;
  appState.settings.neonTheme = el("neonTheme").checked;
  document.body.classList.toggle("neon", appState.settings.neonTheme);
  saveSettings();
  showToast("Settings saved");
};

const updateFilters = () => {
  const platforms = Array.from(new Set(appState.vault.map((idea) => idea.platform)));
  const diff = Array.from(new Set(appState.vault.map((idea) => idea.estimated.difficulty)));
  const monetization = Array.from(new Set(appState.vault.map((idea) => idea.monetization)));
  const platformSelect = el("vaultPlatform");
  const diffSelect = el("vaultDifficulty");
  const moneySelect = el("vaultMonetization");

  platformSelect.innerHTML = `<option value="all">All platforms</option>${platforms.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
  diffSelect.innerHTML = `<option value="all">All difficulty</option>${diff.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
  moneySelect.innerHTML = `<option value="all">All monetization</option>${monetization.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
};

const initEvents = () => {
  document.querySelectorAll("[data-view-target]").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.viewTarget));
  });

  el("wizardPrev").addEventListener("click", () => {
    appState.wizardStep = Math.max(0, appState.wizardStep - 1);
    renderWizardPanel();
  });

  el("wizardNext").addEventListener("click", () => {
    if (appState.wizardStep < wizardSteps.length - 1) {
      appState.wizardStep += 1;
      renderWizardPanel();
    } else {
      appState.wizardAnswers.finalPrompt = appState.wizardAnswers.finalPrompt || getWizardPrompt();
      el("basePrompt").value = appState.wizardAnswers.finalPrompt;
      showToast("Prompt ready in generator");
      setView("generate");
    }
  });

  el("generateBtn").addEventListener("click", generateIdeas);
  el("passBtn").addEventListener("click", () => swipeCard("pass"));
  el("saveBtn").addEventListener("click", () => swipeCard("save"));
  el("exportJson").addEventListener("click", () => exportVault("json"));
  el("exportMarkdown").addEventListener("click", () => exportVault("markdown"));

  el("vaultSearch").addEventListener("input", updateVaultUI);
  el("vaultPlatform").addEventListener("change", updateVaultUI);
  el("vaultDifficulty").addEventListener("change", updateVaultUI);
  el("vaultMonetization").addEventListener("change", updateVaultUI);

  el("apiKey").addEventListener("change", applySettings);
  el("modelName").addEventListener("change", applySettings);
  el("temperature").addEventListener("input", () => {
    el("temperatureValue").textContent = el("temperature").value;
    applySettings();
  });
  el("defaultQuantity").addEventListener("change", applySettings);
  el("defaultSpice").addEventListener("change", applySettings);
  el("reducedMotion").addEventListener("change", applySettings);
  el("neonTheme").addEventListener("change", applySettings);

  el("completeChallenge").addEventListener("click", () => {
    addXp(25, "Daily challenge");
    addBadge("Daily Challenger");
    showToast("Daily challenge complete!");
  });

  el("rerollBtn").addEventListener("click", () => {
    if (!appState.deck.length) return;
    appState.deck[0] = buildIdea(el("basePrompt").value, el("spiceLevel").value);
    renderDeck();
    showPowerUp("Rerolled your top idea.");
  });

  el("enhanceBtn").addEventListener("click", () => {
    if (!appState.deck.length) return;
    appState.deck[0].differentiators.push("Enhanced with a fresh competitive moat");
    appState.deck[0].oneLiner += " Now with sharper positioning.";
    appState.deck[0].buildPrompt = buildPromptTemplate(appState.deck[0]);
    renderDeck();
    showPowerUp("Enhanced the top idea.");
  });

  el("mashupBtn").addEventListener("click", () => {
    if (appState.vault.length < 2) {
      showToast("Save at least 2 ideas to mash up");
      return;
    }
    const [first, second] = appState.vault;
    const mash = buildIdea(`${first.title} + ${second.title}`, "wild");
    mash.oneLiner = `${first.oneLiner} Combined with ${second.oneLiner}`;
    mash.buildPrompt = buildPromptTemplate(mash);
    appState.deck.unshift(mash);
    renderDeck();
    showPowerUp("Mashed up two saved ideas into a fresh concept.");
  });

  el("closeLevelUp").addEventListener("click", () => {
    el("levelUpModal").classList.remove("show");
  });

  el("closePowerUp").addEventListener("click", () => {
    el("powerUpModal").classList.remove("show");
  });

  document.addEventListener("keydown", (event) => {
    if (el("generate").classList.contains("view--active")) {
      if (event.key === "ArrowLeft") swipeCard("pass");
      if (event.key === "ArrowRight") swipeCard("save");
    }
  });
};

const initialize = () => {
  initializeSettings();
  initializeStats();
  initializeDailyChallenge();
  initializeVault();
  buildWizard();
  renderWizardPanel();
  updateFilters();

  const lastBatchStored = JSON.parse(localStorage.getItem(STORAGE_KEYS.lastBatch) || "null");
  if (lastBatchStored) {
    appState.lastBatch = lastBatchStored;
    updateLastBatch();
  }

  el("quantity").value = appState.settings.quantityDefault;
  el("spiceLevel").value = appState.settings.spiceDefault;
  initEvents();
};

initialize();
