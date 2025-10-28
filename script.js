const steps = Array.from(document.querySelectorAll('.step'));
const progressItems = Array.from(document.querySelectorAll('.progress__item'));
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const finalPrompt = document.getElementById('finalPrompt');
const summary = document.getElementById('summary');
const copyBtn = document.getElementById('copyBtn');
const toast = document.getElementById('toast');
const chipGrid = document.getElementById('featureChips');

let currentStep = 0;

const fieldIds = [
  'appName',
  'pitch',
  'persona',
  'motivation',
  'problem',
  'alternatives',
  'features',
  'uniqueness',
  'evidence',
  'monetization',
  'metrics',
  'tone',
  'notes'
];

const fields = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id)]));

function setStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, idx) => {
    step.classList.toggle('active', idx === currentStep);
  });
  progressItems.forEach((item, idx) => {
    item.classList.toggle('active', idx === currentStep);
  });

  prevBtn.disabled = currentStep === 0;
  nextBtn.textContent = currentStep === steps.length - 1 ? 'Finish' : 'Next';

  if (currentStep === steps.length - 1) {
    summary.innerHTML = buildSummary();
  }
}

function buildSummary() {
  const summaryItems = [
    { label: 'Vision', value: combineFields(['appName', 'pitch']) },
    { label: 'Audience', value: combineFields(['persona', 'motivation']) },
    { label: 'Problem', value: combineFields(['problem', 'alternatives']) },
    { label: 'Solution', value: formatFeatureSummary() },
    { label: 'Differentiators', value: combineFields(['uniqueness', 'evidence']) },
    { label: 'Business', value: combineFields(['monetization', 'metrics']) },
    { label: 'Tone & Extras', value: combineFields(['tone', 'notes']) }
  ];

  return summaryItems
    .filter((item) => item.value.trim().length > 0)
    .map(
      (item) => `
        <div class="summary__item">
          <span class="summary__label">${item.label}</span>
          <div class="summary__value">${item.value.replace(/\n/g, '<br>')}</div>
        </div>
      `
    )
    .join('');
}

function combineFields(ids) {
  return ids
    .map((id) => fields[id]?.value?.trim())
    .filter(Boolean)
    .join('\n');
}

function formatFeatureSummary() {
  const items = getCombinedFeatures();
  const text = items.length ? items.join('\n') : '';
  const customText = fields.features.value.trim();
  if (text) return text;
  return customText;
}

function buildPrompt() {
  const featureList = getCombinedFeatures();

  const promptSections = [
    { title: 'App Name', value: fields.appName.value.trim() || 'Untitled App' },
    { title: 'Elevator Pitch', value: fields.pitch.value.trim() || 'Help me build a compelling pitch.' },
    { title: 'User Persona', value: fields.persona.value.trim() || 'Describe the target user clearly.' },
    { title: 'User Goals & Motivations', value: fields.motivation.value.trim() },
    { title: 'Problem Statement', value: fields.problem.value.trim() || 'Summarize the pain point succinctly.' },
    { title: 'Current Alternatives', value: fields.alternatives.value.trim() },
    {
      title: 'Core Features & Experience',
      value: featureList.length ? featureList.map((item) => `- ${item}`).join('\n') : '- Suggest engaging core features.'
    },
    { title: 'Unique Value', value: fields.uniqueness.value.trim() || 'Highlight what differentiates this solution.' },
    { title: 'Proof or Inspiration', value: fields.evidence.value.trim() },
    { title: 'Monetization Strategy', value: fields.monetization.value.trim() || 'Recommend viable monetization ideas.' },
    { title: 'Success Metrics', value: fields.metrics.value.trim() },
    { title: 'Product Voice & Tone', value: fields.tone.value.trim() || 'Keep the tone friendly and empowering.' },
    { title: 'Additional Notes', value: fields.notes.value.trim() }
  ];

  const promptBody = promptSections
    .filter((section) => section.value)
    .map((section, index) => `${index + 1}. ${section.title}:
${section.value}`)
    .join('\n\n');

  finalPrompt.value = `You are an expert AI product builder. Use the following brief to create a development-ready plan and UI flow.\n\n${promptBody}\n\nDeliver a structured plan with feature list, UX notes, and next steps for implementation.`;
}

function getCombinedFeatures() {
  const chips = Array.from(chipGrid.querySelectorAll('.chip.selected')).map((chip) => chip.dataset.value);
  const customFeatures = fields.features.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return [...chips, ...customFeatures];
}

function updatePrompt() {
  buildPrompt();
  if (currentStep === steps.length - 1) {
    summary.innerHTML = buildSummary();
  }
}

prevBtn.addEventListener('click', () => {
  setStep(currentStep - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    setStep(currentStep + 1);
  }
});

Object.values(fields).forEach((field) => {
  field.addEventListener('input', updatePrompt);
});

chipGrid.addEventListener('click', (event) => {
  const target = event.target;
  if (target.classList.contains('chip')) {
    target.classList.toggle('selected');
    updatePrompt();
  }
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard
    .writeText(finalPrompt.value)
    .then(() => {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1800);
    })
    .catch(() => {
      toast.textContent = 'Unable to copy. Select and copy manually!';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        toast.textContent = 'Prompt copied to clipboard';
      }, 2400);
    });
});

setStep(0);
buildPrompt();
