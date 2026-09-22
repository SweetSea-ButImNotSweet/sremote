/**
 * SRemote Interactive Integration Wizard Controller
 * Handles Stepper State, Dynamic Mermaid Diagram Rendering, and Branch Tabs.
 */

document.addEventListener('DOMContentLoaded', () => {
  const stepBtns = document.querySelectorAll('.wizard-step-btn');
  const stepPanes = document.querySelectorAll('.wizard-step-pane');
  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');
  const branchCards = document.querySelectorAll('.wizard-branch-card');
  const branchPanes = document.querySelectorAll('.wizard-branch-content-pane');
  const mermaidContainer = document.getElementById('wizard-mermaid-box');

  let currentStep = 1;
  const totalSteps = 4;

  // Initialize Mermaid with Dark Modern Theme
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: '#0b1120',
        primaryColor: '#0369a1',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#38bdf8',
        lineColor: '#38bdf8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0b1120',
      }
    });
  }

  // Render dynamic roadmap diagram highlighting current position
  function renderStepDiagram(step) {
    if (!mermaidContainer || typeof mermaid === 'undefined') return;

    const n1Class = step === 1 ? 'activeNode' : (step > 1 ? 'doneNode' : 'pendingNode');
    const n2Class = step === 2 ? 'activeNode' : (step > 2 ? 'doneNode' : 'pendingNode');
    const n3Class = step === 3 ? 'activeNode' : (step > 3 ? 'doneNode' : 'pendingNode');
    const n4Class = step === 4 ? 'activeNode' : 'pendingNode';

    const pin1 = step === 1 ? ' 📍 [BẠN ĐANG Ở ĐÂY]' : (step > 1 ? ' ✓ [XONG]' : '');
    const pin2 = step === 2 ? ' 📍 [BẠN ĐANG Ở ĐÂY]' : (step > 2 ? ' ✓ [XONG]' : '');
    const pin3 = step === 3 ? ' 📍 [BẠN ĐANG Ở ĐÂY]' : (step > 3 ? ' ✓ [XONG]' : '');
    const pin4 = step === 4 ? ' 📍 [BẠN ĐANG Ở ĐÂY]' : '';

    const mermaidCode = `
flowchart LR
    S1["1. Chuẩn bị DOM / Iframe${pin1}"]:::${n1Class} --> S2["2. Cài đặt Gói Thư viện${pin2}"]:::${n2Class}
    S2 --> S3["3. Bắt tay & Khởi tạo${pin3}"]:::${n3Class}
    S3 --> S4["4. Rẽ nhánh Ứng dụng Thực chiến${pin4}"]:::${n4Class}

    classDef doneNode fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#86efac;
    classDef activeNode fill:#0369a1,stroke:#38bdf8,stroke-width:3px,color:#ffffff;
    classDef pendingNode fill:#1e293b,stroke:#475569,stroke-width:1.5px,color:#94a3b8;
    `.trim();

    const chartId = 'wizard_mermaid_' + Math.random().toString(36).substring(2, 9);
    mermaid.render(chartId, mermaidCode).then(({ svg }) => {
      mermaidContainer.innerHTML = svg;
    }).catch(err => {
      console.warn('Lỗi render Mermaid wizard:', err);
    });
  }

  // Switch active step
  function setStep(step) {
    if (step < 1) step = 1;
    if (step > totalSteps) step = totalSteps;
    currentStep = step;

    // Update buttons state
    stepBtns.forEach((btn, idx) => {
      const sNum = idx + 1;
      btn.classList.toggle('active', sNum === currentStep);
      btn.classList.toggle('completed', sNum < currentStep);
    });

    // Update panes
    stepPanes.forEach((pane, idx) => {
      const sNum = idx + 1;
      pane.classList.toggle('active', sNum === currentStep);
    });

    // Update footer navigation buttons
    if (prevBtn) prevBtn.disabled = currentStep === 1;
    if (nextBtn) {
      if (currentStep === totalSteps) {
        nextBtn.innerHTML = '🎉 Đã hoàn tất Lộ trình';
        nextBtn.disabled = true;
      } else {
        nextBtn.innerHTML = `Bước tiếp theo (${currentStep + 1}/${totalSteps}) ➔`;
        nextBtn.disabled = false;
      }
    }

    // Highlight code blocks
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('.wizard-step-pane.active pre code').forEach(el => {
        hljs.highlightElement(el);
      });
    }

    // Render Mermaid roadmap
    renderStepDiagram(currentStep);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bind Stepper Bar clicks
  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = parseInt(btn.getAttribute('data-step'), 10);
      if (!isNaN(s)) setStep(s);
    });
  });

  // Prev / Next actions
  if (prevBtn) prevBtn.addEventListener('click', () => setStep(currentStep - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => setStep(currentStep + 1));

  // Branch selector clicks (Step 4)
  branchCards.forEach(card => {
    card.addEventListener('click', () => {
      const branchKey = card.getAttribute('data-branch');
      branchCards.forEach(c => c.classList.toggle('active', c === card));
      branchPanes.forEach(p => {
        const isMatch = p.getAttribute('data-branch') === branchKey;
        p.classList.toggle('active', isMatch);
        if (isMatch && typeof hljs !== 'undefined') {
          p.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
        }
      });
    });
  });

  // Copy code snippet buttons
  document.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pre = btn.closest('.code-block-wrapper')?.querySelector('pre code');
      if (pre) {
        await navigator.clipboard.writeText(pre.textContent);
        const orig = btn.textContent;
        btn.textContent = '✓ Đã chép!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      }
    });
  });

  // Initial step activation
  setStep(1);
});
