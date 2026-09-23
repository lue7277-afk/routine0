/**
 * ROUTINE 0 - Interactive App Simulator
 * 5 Core Service Modules:
 * 1. Menu Browsing (Nutritional spec & category filter)
 * 2. Order & Customization (Dressing, toppings, mock payment)
 * 3. Pickup Time Scheduling (10/15/20/25/30/40/45/50/55/60 min presets & ETA calc)
 * 4. Remaining Time Tracker (1s Realtime Timer & SVG circular ring & 3-stage state)
 * 5. Pickup Notification & Locker (Locker ticket, QR mock, routine achievement report)
 */

// ==========================================
// 1. Mock Menu Data (Organic & High-Protein)
// ==========================================
const MENU_DATA = [
  {
    id: 'm1',
    category: 'bowl',
    name: '수비드 닭가슴살 & 아보카도 보울',
    price: 8900,
    protein: 38,
    calories: 420,
    sugar: 2,
    emoji: '🥗',
    desc: '촉촉하게 수비드한 저염 닭가슴살과 신선한 생 아보카도, 귀리 퀴노아 믹스.',
    recommendTime: 15
  },
  {
    id: 'm2',
    category: 'bowl',
    name: '그릴드 비프 & 퀴노아 웜보울',
    price: 10500,
    protein: 42,
    calories: 510,
    sugar: 3,
    emoji: '🥩',
    desc: '기름기를 쏙 뺀 호주산 채끝살과 따뜻한 볶은 퀴노아, 구운 야채 플래터.',
    recommendTime: 20
  },
  {
    id: 'm3',
    category: 'bowl',
    name: '노르웨이 생연어 & 바질 펜네 보울',
    price: 11200,
    protein: 34,
    calories: 460,
    sugar: 1.5,
    emoji: '🥑',
    desc: '슈퍼푸드 생연어 사시미 큐브와 수제 바질 페스토로 버무린 통밀 펜네.',
    recommendTime: 15
  },
  {
    id: 'm4',
    category: 'drink',
    name: '웨이 프로틴 카카오 말차 스무디',
    price: 5500,
    protein: 28,
    calories: 210,
    sugar: 1,
    emoji: '🥤',
    desc: '유기농 제주 말차와 WPI 분리유청단백질, 무가당 아몬드 밀크 블렌딩.',
    recommendTime: 10
  },
  {
    id: 'm5',
    category: 'snack',
    name: '수제 저당 그릭요거트 & 그래놀라',
    price: 4800,
    protein: 18,
    calories: 280,
    sugar: 3,
    emoji: '🥣',
    desc: '꾸덕한 질감의 무가당 그릭요거트에 직접 구운 저당 통곡물 그래놀라 토핑.',
    recommendTime: 10
  },
  {
    id: 'm6',
    category: 'drink',
    name: '클린 부스터 아르기닌 레몬티',
    price: 4500,
    protein: 8,
    calories: 85,
    sugar: 0,
    emoji: '🍋',
    desc: '운동 후 피로 회복을 돕는 L-아르기닌 3,000mg과 유기농 레몬 착즙 주스.',
    recommendTime: 10
  }
];

// ==========================================
// 2. Application State Management (No-DB)
// ==========================================
const AppState = {
  currentCategory: 'all',
  selectedMenu: null,
  cart: [],
  
  // Pickup scheduling state
  pickupMinutes: 15,
  pickupETA: '',
  selectedDressing: '저당 오리엔탈',
  selectedToppings: [],
  
  // Timer state
  timerInterval: null,
  timerTotalSeconds: 15 * 60,
  timerRemainingSeconds: 15 * 60,
  isTimerRunning: false,
  timerSpeedMultiplier: 1, // 1x or 10x
  
  // Routine stage: 'ready' -> 'cooking' -> 'completed'
  routineStage: 'ready',
  lockerNumber: 'B-04',

  // Partner gym state (Sub 6 & Sub 7)
  currentGym: {
    id: "default",
    name: "여의도 IFC 피트니스점",
    shortName: "여의도 IFC점",
    district: "영등포구",
    address: "서울특별시 영등포구 국제금융로 10 IFC몰 B2",
    isPartner: false,
    lockerPrefix: "IFC 락커",
    discountPercent: 0
  },
  isPartnerDiscountActive: false,
  
  // Cumulative user achievements (saved to localStorage)
  stats: {
    savedMinutes: 45,
    intakeProtein: 114,
    orderCount: 3
  }
};

// ==========================================
// 3. Audio Chime (Web Audio API)
// ==========================================
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Play warm dual-tone chime
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.log('Audio autoplay prevented or unsupported');
  }
}

// ==========================================
// 4. Core Feature 1: Menu Browsing
// ==========================================
function renderMenuGrid() {
  const container = document.getElementById('menu-grid-container');
  if (!container) return;
  
  const filtered = AppState.currentCategory === 'all'
    ? MENU_DATA
    : MENU_DATA.filter(m => m.category === AppState.currentCategory);
    
  container.innerHTML = filtered.map(item => `
    <div class="menu-card" onclick="openOrderModal('${item.id}')">
      <div class="menu-thumb">${item.emoji}</div>
      <div class="menu-info">
        <div>
          <div class="menu-name">${item.name}</div>
          <div class="menu-tags">
            <span class="nutrient-tag">단백질 ${item.protein}g</span>
            <span class="nutrient-tag" style="background: rgba(246, 206, 76, 0.35);">${item.calories}kcal</span>
            <span class="nutrient-tag" style="background: rgba(47, 79, 48, 0.1);">당류 ${item.sugar}g</span>
          </div>
        </div>
        <div class="menu-bottom-row">
          <div class="menu-price">${item.price.toLocaleString()}원</div>
          <button class="quick-add-btn" title="바로 픽업 예약" onclick="event.stopPropagation(); openOrderModal('${item.id}');">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function setMenuCategory(cat, element) {
  AppState.currentCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(el => el.classList.remove('active'));
  if (element) element.classList.add('active');
  renderMenuGrid();
}

// ==========================================
// 5. Core Feature 2 & 3: Order & Pickup Scheduling
// ==========================================
function openOrderModal(menuId) {
  const menu = MENU_DATA.find(m => m.id === menuId);
  if (!menu) return;
  AppState.selectedMenu = menu;
  
  // Set default recommended pickup time
  AppState.pickupMinutes = menu.recommendTime || 15;
  calculatePickupETA();
  
  // Fill Modal Content
  document.getElementById('modal-menu-name').innerText = menu.name;
  document.getElementById('modal-menu-desc').innerText = menu.desc;
  document.getElementById('modal-menu-price').innerText = `${menu.price.toLocaleString()}원`;
  document.getElementById('modal-menu-protein').innerText = `${menu.protein}g`;
  document.getElementById('modal-menu-calories').innerText = `${menu.calories}kcal`;
  
  updatePickupChipUI();
  updateModalFinalPrice();
  
  const modal = document.getElementById('order-modal');
  if (modal) modal.classList.add('open');
}

function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  if (modal) modal.classList.remove('open');
}

// Pickup Time ETA Calculation (Current Time + N mins)
function calculatePickupETA() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + AppState.pickupMinutes);
  
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  AppState.pickupETA = `${ampm} ${hours}:${minutes}`;
  const display = document.getElementById('pickup-eta-display');
  if (display) {
    display.innerText = `${AppState.pickupETA} 도착`;
  }
}

// 10 Granular Presets (10, 15, 20, 25, 30, 40, 45, 50, 55, 60 mins)
function selectPickupPreset(mins) {
  AppState.pickupMinutes = parseInt(mins, 10);
  calculatePickupETA();
  updatePickupChipUI();
}

function adjustPickupMinutes(delta) {
  const newMins = AppState.pickupMinutes + delta;
  if (newMins >= 5 && newMins <= 90) {
    AppState.pickupMinutes = newMins;
    calculatePickupETA();
    updatePickupChipUI();
  }
}

function updatePickupChipUI() {
  const chips = document.querySelectorAll('.time-chip');
  chips.forEach(chip => {
    const val = parseInt(chip.getAttribute('data-min'), 10);
    if (val === AppState.pickupMinutes) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
  const customVal = document.getElementById('custom-pickup-mins');
  if (customVal) customVal.innerText = `${AppState.pickupMinutes}분`;
}

function selectDressing(dressing, element) {
  AppState.selectedDressing = dressing;
  document.querySelectorAll('.dressing-chip').forEach(el => el.classList.remove('selected'));
  if (element) element.classList.add('selected');
}

function toggleTopping(toppingName, price, element) {
  element.classList.toggle('selected');
  const idx = AppState.selectedToppings.findIndex(t => t.name === toppingName);
  if (idx > -1) {
    AppState.selectedToppings.splice(idx, 1);
  } else {
    AppState.selectedToppings.push({ name: toppingName, price: price });
  }
  updateModalFinalPrice();
}

function updateModalFinalPrice() {
  if (!AppState.selectedMenu) return;
  const toppingTotal = AppState.selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const subtotal = AppState.selectedMenu.price + toppingTotal;
  
  let discount = 0;
  if (AppState.isPartnerDiscountActive) {
    discount = Math.round(subtotal * 0.1);
  }
  const finalPrice = subtotal - discount;

  const discountRow = document.getElementById('modal-discount-row');
  const discountAmount = document.getElementById('modal-discount-amount');
  if (discountRow) {
    discountRow.style.display = AppState.isPartnerDiscountActive ? 'block' : 'none';
    if (discountAmount) {
      discountAmount.innerText = `-${discount.toLocaleString()}원`;
    }
  }

  const btn = document.getElementById('modal-submit-btn');
  if (btn) {
    if (AppState.isPartnerDiscountActive) {
      btn.innerHTML = `<span>${finalPrice.toLocaleString()}원 (10% 제휴할인) · 픽업 예약</span> <i class="fa-solid fa-arrow-right"></i>`;
    } else {
      btn.innerHTML = `<span>${finalPrice.toLocaleString()}원 · 픽업 예약 주문하기</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  }
}

// Execute Mock Order
function submitOrder() {
  closeOrderModal();
  
  // Show Loading feedback on Dynamic Island
  const island = document.getElementById('dynamic-island');
  if (island) {
    island.classList.add('active');
    island.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>주문 접수 중...</span>`;
  }
  
  setTimeout(() => {
    startRoutineTracker();
  }, 700);
}

// ==========================================
// 6. Core Feature 4: Live Routine Tracker
// ==========================================
function startRoutineTracker() {
  // Switch to Tracker View
  showScreen('screen-tracker');
  
  const island = document.getElementById('dynamic-island');
  if (island) {
    island.classList.add('active');
    island.innerHTML = `<span style="color: var(--brand-lime);">●</span> <span>${AppState.pickupMinutes}분 후 픽업</span>`;
  }
  
  // Initialize timer
  AppState.timerTotalSeconds = AppState.pickupMinutes * 60;
  AppState.timerRemainingSeconds = AppState.timerTotalSeconds;
  AppState.isTimerRunning = true;
  AppState.routineStage = 'ready';
  
  updateTimerUI();
  updateStepIndicator();
  
  if (AppState.timerInterval) clearInterval(AppState.timerInterval);
  
  // 1-second interval ticking
  AppState.timerInterval = setInterval(() => {
    if (!AppState.isTimerRunning) return;
    
    // Decrement by speed multiplier
    AppState.timerRemainingSeconds -= AppState.timerSpeedMultiplier;
    
    if (AppState.timerRemainingSeconds <= 0) {
      AppState.timerRemainingSeconds = 0;
      clearInterval(AppState.timerInterval);
      triggerPickupReadyNotification();
    }
    
    updateTimerUI();
    updateStepIndicator();
  }, 1000);
}

function updateTimerUI() {
  const mins = Math.floor(AppState.timerRemainingSeconds / 60);
  const secs = AppState.timerRemainingSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  const timerDisplay = document.getElementById('timer-time-display');
  if (timerDisplay) timerDisplay.innerText = timeStr;
  
  // Update Circular SVG progress ring (circumference = 565)
  const progressCircle = document.getElementById('timer-progress-ring');
  if (progressCircle && AppState.timerTotalSeconds > 0) {
    const ratio = AppState.timerRemainingSeconds / AppState.timerTotalSeconds;
    const offset = 565 * (1 - ratio);
    progressCircle.style.strokeDashoffset = offset;
    
    // Change color as time gets closer
    if (ratio <= 0.2) {
      progressCircle.style.stroke = 'var(--brand-yellow)';
    } else {
      progressCircle.style.stroke = 'var(--brand-olive)';
    }
  }
  
  // Update sidebar live readout if available
  const debugTimer = document.getElementById('sim-debug-timer');
  if (debugTimer) debugTimer.innerText = timeStr;
}

function updateStepIndicator() {
  const step1 = document.getElementById('routine-step-1');
  const step2 = document.getElementById('routine-step-2');
  const step3 = document.getElementById('routine-step-3');
  
  const remaining = AppState.timerRemainingSeconds;
  const total = AppState.timerTotalSeconds;
  
  // Step 1: Order received, preparing
  // Step 2: Fresh cooking (last 10 minutes or remaining < 50%)
  // Step 3: Complete in warming locker (0s)
  if (remaining === 0) {
    AppState.routineStage = 'completed';
    if (step1) step1.classList.add('active');
    if (step2) step2.classList.add('active');
    if (step3) step3.classList.add('active');
  } else if (remaining <= 600 || remaining <= total * 0.5) {
    AppState.routineStage = 'cooking';
    if (step1) step1.classList.add('active');
    if (step2) step2.classList.add('active');
    if (step3) step3.classList.remove('active');
  } else {
    AppState.routineStage = 'ready';
    if (step1) step1.classList.add('active');
    if (step2) step2.classList.remove('active');
    if (step3) step3.classList.remove('active');
  }
}

// ==========================================
// 7. Core Feature 5: Pickup Notification & Locker
// ==========================================
function triggerPickupReadyNotification() {
  playChimeSound();
  
  const island = document.getElementById('dynamic-island');
  if (island) {
    island.innerHTML = `<span style="color: var(--brand-lime);">🔔</span> <span>조리 완료! #${AppState.lockerNumber}</span>`;
  }
  
  const readyCard = document.getElementById('pickup-ready-card');
  if (readyCard) {
    readyCard.classList.add('show');
    readyCard.scrollIntoView({ behavior: 'smooth' });
  }
}

function completePickupAction() {
  // Update cumulative stats
  AppState.stats.savedMinutes += AppState.pickupMinutes;
  if (AppState.selectedMenu) {
    AppState.stats.intakeProtein += AppState.selectedMenu.protein;
  }
  AppState.stats.orderCount += 1;
  localStorage.setItem('routine0_stats', JSON.stringify(AppState.stats));
  
  // Show Achievement Report Modal
  document.getElementById('report-saved-mins').innerText = `+${AppState.pickupMinutes}분`;
  document.getElementById('report-protein-intake').innerText = AppState.selectedMenu ? `+${AppState.selectedMenu.protein}g` : '+38g';
  document.getElementById('report-total-saved').innerText = `${AppState.stats.savedMinutes}분`;
  
  const reportModal = document.getElementById('report-modal');
  if (reportModal) reportModal.classList.add('open');
}

function closeReportAndReset() {
  const reportModal = document.getElementById('report-modal');
  if (reportModal) reportModal.classList.remove('open');
  
  resetSimulator();
  showScreen('screen-home');
}

// ==========================================
// 8. Simulator Controls (Fast-Forward & Skip)
// ==========================================
function toggleFastForward() {
  const btn = document.getElementById('sim-ff-btn');
  if (AppState.timerSpeedMultiplier === 1) {
    AppState.timerSpeedMultiplier = 10;
    if (btn) btn.classList.add('active');
  } else {
    AppState.timerSpeedMultiplier = 1;
    if (btn) btn.classList.remove('active');
  }
}

function skipToCookingComplete() {
  if (!AppState.isTimerRunning && AppState.timerRemainingSeconds <= 0) return;
  AppState.timerRemainingSeconds = 1;
  updateTimerUI();
}

function toggleTimerPause() {
  AppState.isTimerRunning = !AppState.isTimerRunning;
  const btn = document.getElementById('sim-pause-btn');
  if (btn) {
    btn.innerText = AppState.isTimerRunning ? '⏸️ 일시정지' : '▶️ 재개';
  }
}

function resetSimulator() {
  if (AppState.timerInterval) clearInterval(AppState.timerInterval);
  AppState.isTimerRunning = false;
  AppState.timerRemainingSeconds = 15 * 60;
  AppState.timerSpeedMultiplier = 1;
  
  const readyCard = document.getElementById('pickup-ready-card');
  if (readyCard) readyCard.classList.remove('show');
  
  const island = document.getElementById('dynamic-island');
  if (island) {
    island.classList.remove('active');
    island.innerHTML = `<span style="font-weight:800; color:var(--brand-lime)">0</span> ROUTINE 0`;
  }
  
  showScreen('screen-home');
}

// ==========================================
// 9. View Navigation
// ==========================================
function showScreen(screenId) {
  document.querySelectorAll('.app-screen-view').forEach(view => {
    view.style.display = 'none';
  });
  const target = document.getElementById(screenId);
  if (target) target.style.display = 'block';
  
  // Update Bottom Nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-target') === screenId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Realtime Clock on Phone Status Bar
function startRealtimeClock() {
  function update() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockElem = document.getElementById('status-realtime-clock');
    if (clockElem) {
      clockElem.innerText = `${hours}:${minutes}`;
    }
  }
  update();
  setInterval(update, 1000);
}

// ==========================================
// 10. [Sub 6 & 7] Partner Banner & Gym Map System
// ==========================================

const VIRTUAL_PARTNER_GYM = {
  id: "ROUTINE0_PARTNER_CENTUM_01",
  name: "루틴제로 센텀 제휴 피트니스 (공식 제휴 1호점)",
  shortName: "루틴제로 센텀 제휴점",
  district: "해운대구",
  dong: "우동",
  address: "부산광역시 해운대구 센텀중앙로 78 (신세계 센텀 맞은편, 센텀시티역 4번출구 120m)",
  lat: 35.1702,
  lng: 129.1298,
  isPartner: true,
  isOfficial: true,
  lockerCount: 16,
  availableLockers: 6,
  discount: "10%",
  benefit: "전 메뉴 10% 자동 할인 · 스마트 온열 락커 #01~#08 우선 배정 · 샤워시간 맞춤 조리",
  badge: "⭐ 공식 제휴 1호점",
  phone: "051-740-0000",
  hours: "06:00 ~ 23:00 (모닝 루틴 운영)"
};

let gymMapInstance = null;
let currentGymMarkers = [];
let currentFilterDistrict = 'partner';
let googleRoadTileLayer = null;

function openGymMapModal() {
  const modal = document.getElementById('gym-map-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
  
  // Delay slightly to let modal layout complete before initializing Leaflet
  setTimeout(() => {
    initGymMap();
  }, 100);

  // Invalidate size again after slide-up animation completes to prevent partial tile render
  setTimeout(() => {
    if (gymMapInstance) {
      gymMapInstance.invalidateSize();
      gymMapInstance.setView([35.1702, 129.1298], 15);
    }
  }, 350);
}

function closeGymMapModal() {
  const modal = document.getElementById('gym-map-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function initGymMap() {
  const mapContainer = document.getElementById('gym-map-viewport');
  if (!mapContainer) return;

  // Check if Leaflet library is loaded
  if (typeof L === 'undefined') {
    renderFallbackSvgMap();
    renderGymMarkers(currentFilterDistrict);
    showGymDetail(VIRTUAL_PARTNER_GYM);
    return;
  }

  try {
    if (!gymMapInstance) {
      gymMapInstance = L.map('gym-map-viewport', {
        zoomControl: true,
        attributionControl: false
      }).setView([35.1702, 129.1298], 15);

      // Google Maps Roadmap only (No API key required, crisp Korean labels, fast worldwide CDN)
      googleRoadTileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=ko&gl=KR&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
      }).addTo(gymMapInstance);
    } else {
      gymMapInstance.invalidateSize();
      gymMapInstance.setView([35.1702, 129.1298], 15);
    }

    renderGymMarkers(currentFilterDistrict);
    showGymDetail(VIRTUAL_PARTNER_GYM);
  } catch (err) {
    console.warn('Leaflet initialization failed, switching to SVG map fallback:', err);
    renderFallbackSvgMap();
    showGymDetail(VIRTUAL_PARTNER_GYM);
  }
}

// Fallback Interactive Visual Map in case of offline/network block
function renderFallbackSvgMap() {
  const mapContainer = document.getElementById('gym-map-viewport');
  if (!mapContainer) return;
  mapContainer.innerHTML = `
    <div style="width: 100%; height: 100%; background: #EAE6DB; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
      <!-- Grid Lines Pattern -->
      <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; opacity: 0.25;">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#2F4F30" stroke-width="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <!-- Suyeong River Outline -->
        <path d="M 40 0 Q 70 110 50 220" stroke="#7BA8A4" stroke-width="24" fill="none" opacity="0.6"/>
        <text x="60" y="110" font-size="10" fill="#486B67" font-weight="bold">수영강</text>
        <!-- Centum Subway line -->
        <path d="M 0 140 L 400 120" stroke="#8A998E" stroke-width="4" stroke-dasharray="6,4" fill="none"/>
        <circle cx="210" cy="128" r="5" fill="#2F4F30"/>
        <text x="180" y="148" font-size="10" fill="#1F2E23" font-weight="bold">센텀시티역 (2호선)</text>
        <text x="230" y="90" font-size="10" fill="#58695C">신세계백화점 센텀시티</text>
      </svg>

      <!-- Center Flagship Partner Marker -->
      <div style="position: absolute; top: 38%; left: 52%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; cursor: pointer;" onclick="showGymDetail(VIRTUAL_PARTNER_GYM)">
        <div style="background: #1F2E23; color: #CBE65B; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 6px; border: 1px solid #CBE65B; margin-bottom: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ⭐ 공식 1호 제휴점 (10% 할인)
        </div>
        <div style="width: 38px; height: 38px; background: #2F4F30; border: 3px solid #FFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #CBE65B; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
          <i class="fa-solid fa-dumbbell"></i>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #1F2E23; margin-top: 3px; background: rgba(255,255,255,0.85); padding: 1px 6px; border-radius: 4px;">
          루틴제로 센텀 제휴점
        </div>
      </div>
    </div>
  `;
}

function renderGymMarkers(filterType, searchQuery = '') {
  if (!gymMapInstance || typeof L === 'undefined') return;

  // Clear existing markers
  currentGymMarkers.forEach(m => gymMapInstance.removeLayer(m));
  currentGymMarkers = [];

  // Determine gyms to display
  let list = [];
  const rawList = (typeof GYM_DATA !== 'undefined' && Array.isArray(GYM_DATA)) ? GYM_DATA : [VIRTUAL_PARTNER_GYM];

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = rawList.filter(g => 
      (g.name && g.name.toLowerCase().includes(q)) || 
      (g.address && g.address.toLowerCase().includes(q)) ||
      (g.district && g.district.toLowerCase().includes(q))
    ).slice(0, 30);
  } else if (filterType === 'partner') {
    // Only the virtual partner flagship 1st gym!
    list = [VIRTUAL_PARTNER_GYM];
  } else if (filterType === 'all') {
    // Include 1st partner flagship at top, followed by regular gyms
    const others = rawList.filter(g => g.id !== VIRTUAL_PARTNER_GYM.id && g.id !== 'ROUTINE0_PARTNER_CENTUM_01').slice(0, 40);
    list = [VIRTUAL_PARTNER_GYM, ...others];
  } else {
    // Filter by district: include 1st partner flagship only if district is 해운대구
    const districtGyms = rawList.filter(g => g.id !== VIRTUAL_PARTNER_GYM.id && g.id !== 'ROUTINE0_PARTNER_CENTUM_01' && g.district === filterType).slice(0, 25);
    list = (filterType === '해운대구') ? [VIRTUAL_PARTNER_GYM, ...districtGyms] : districtGyms;
  }

  // Partner Flagship Custom Icon (ONLY for official 1호점)
  const partnerIcon = L.divIcon({
    className: 'partner-custom-marker',
    html: `
      <div class="partner-pin-pulse">
        <div class="pulse-ring"></div>
        <div class="pin-head"><i class="fa-solid fa-dumbbell"></i></div>
        <div class="pin-tag">공식 1호점</div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });

  // Normal Gym Icon (For all other non-partner gyms)
  const normalIcon = L.divIcon({
    className: 'normal-custom-marker',
    html: `<div class="normal-gym-marker"><i class="fa-solid fa-dumbbell"></i></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  list.forEach(gym => {
    if (!gym.lat || !gym.lng) return;
    const isFlagship = (gym.id === VIRTUAL_PARTNER_GYM.id || gym.id === 'ROUTINE0_PARTNER_CENTUM_01');
    const marker = L.marker([gym.lat, gym.lng], {
      icon: isFlagship ? partnerIcon : normalIcon,
      zIndexOffset: isFlagship ? 1000 : 100
    }).addTo(gymMapInstance);

    marker.on('click', () => {
      showGymDetail(gym);
      gymMapInstance.setView([gym.lat, gym.lng], isFlagship ? 16 : 15);
    });

    currentGymMarkers.push(marker);
  });
}

function showGymDetail(gym) {
  const card = document.getElementById('gym-detail-card');
  if (!card) return;

  const isFlagship = (gym.id === VIRTUAL_PARTNER_GYM.id || gym.id === 'ROUTINE0_PARTNER_CENTUM_01');
  const isSelected = (AppState.currentGym && AppState.currentGym.id === gym.id);

  if (isFlagship) {
    // Only virtual partner 1호점 displays partner badge, discount, smart locker!
    card.innerHTML = `
      <div class="featured-partner-box">
        <div class="featured-flagship-badge">
          <i class="fa-solid fa-award"></i> ⭐ 공식 제휴 1호점 · 센텀 플래그십
        </div>
        <h4 class="partner-gym-name">${gym.name}</h4>
        <div class="partner-gym-address">
          <i class="fa-solid fa-location-dot" style="color: var(--brand-olive);"></i>
          <span>${gym.address || '부산광역시 해운대구 우동'}</span>
        </div>

        <div class="partner-perks-grid">
          <div class="perk-pill">
            <div class="perk-label">제휴 혜택</div>
            <div class="perk-value"><i class="fa-solid fa-percent text-lime"></i> 10% 상시할인</div>
          </div>
          <div class="perk-pill">
            <div class="perk-label">스마트 보온 락커</div>
            <div class="perk-value"><i class="fa-solid fa-box text-lime"></i> 6석 여유 / 16구</div>
          </div>
        </div>

        <button class="select-partner-gym-btn ${isSelected && AppState.isPartnerDiscountActive ? 'active-btn' : ''}" onclick="selectPartnerGym('${gym.id}')">
          <i class="fa-solid ${isSelected && AppState.isPartnerDiscountActive ? 'fa-circle-check' : 'fa-bolt'}"></i>
          <span>${isSelected && AppState.isPartnerDiscountActive ? '현재 적용 중인 공식 제휴 헬스장입니다' : '이 제휴 헬스장으로 루틴 시작하기 (10% 할인)'}</span>
        </button>
      </div>
    `;
  } else {
    // All other gyms: Strictly NO partner mark, NO partner benefits!
    card.innerHTML = `
      <div class="featured-partner-box regular-gym-box">
        <div class="regular-gym-badge">
          <i class="fa-solid fa-dumbbell"></i> 일반 피트니스
        </div>
        <h4 class="partner-gym-name">${gym.name}</h4>
        <div class="partner-gym-address">
          <i class="fa-solid fa-location-dot" style="color: var(--text-muted);"></i>
          <span>${gym.address || '부산광역시'}</span>
        </div>

        <div class="regular-info-grid">
          <div class="regular-info-item">
            <div class="info-label">제휴 여부</div>
            <div class="info-val">제휴 미체결 (정가 운영)</div>
          </div>
          <div class="regular-info-item">
            <div class="info-label">픽업 방식</div>
            <div class="info-val">매장 카운터 직접 픽업</div>
          </div>
        </div>

        <button class="select-regular-gym-btn ${isSelected && !AppState.isPartnerDiscountActive ? 'active-btn' : ''}" onclick="selectRegularGym('${gym.id}')">
          <i class="fa-solid fa-store"></i>
          <span>${isSelected && !AppState.isPartnerDiscountActive ? '현재 선택된 일반 매장입니다' : '이 피트니스로 매장 지정 (정가 주문)'}</span>
        </button>
      </div>
    `;
  }
}

function selectRegularGym(gymId) {
  const rawList = (typeof GYM_DATA !== 'undefined' && Array.isArray(GYM_DATA)) ? GYM_DATA : [];
  const gym = rawList.find(g => g.id === gymId) || { id: gymId, name: '일반 피트니스', address: '' };

  AppState.isPartnerDiscountActive = false;
  AppState.currentGym = gym;
  AppState.lockerNumber = '카운터 수령대';

  // 1. Update In-App Header
  const nameElem = document.getElementById('current-gym-name');
  if (nameElem) nameElem.innerText = gym.name;
  const badgeElem = document.getElementById('partner-status-badge');
  if (badgeElem) badgeElem.style.display = 'none';

  // 2. Reset In-App Banner
  const banner = document.getElementById('partner-benefit-banner');
  if (banner) {
    banner.classList.remove('active-partner');
  }
  const tagElem = document.getElementById('partner-banner-tag');
  if (tagElem) {
    tagElem.className = 'partner-badge-chip';
    tagElem.innerHTML = `<i class="fa-solid fa-dumbbell"></i> 피트니스 제휴 혜택`;
  }
  const titleElem = document.getElementById('partner-banner-title');
  if (titleElem) {
    titleElem.innerHTML = `공식 1호점 등록 시 <span class="highlight">10% 상시 할인</span>`;
  }
  const descElem = document.getElementById('partner-banner-desc');
  if (descElem) {
    descElem.innerText = `● 공식 제휴 1호점(센텀)을 선택하시면 10% 자동 할인과 스마트 락커가 제공됩니다.`;
  }

  // 3. Update Diagnostics Sidebar
  const simGym = document.getElementById('sim-debug-gym');
  if (simGym) simGym.innerText = gym.name;
  const simBenefit = document.getElementById('sim-debug-benefit');
  if (simBenefit) {
    simBenefit.innerText = '미적용 (일반 매장)';
    simBenefit.style.color = '#7A8C7F';
  }
  const simLocker = document.getElementById('sim-debug-locker');
  if (simLocker) simLocker.innerText = '카운터 수령 (락커 미지원)';

  // 4. Update modal final prices if open
  updateModalFinalPrice();

  // 5. Close Map Modal
  closeGymMapModal();

  // 6. Toast Notification
  showToast(`📍 "${gym.name}" 매장이 설정되었습니다. (제휴 미체결 매장으로 정가 결제됩니다.)`);
}

function selectPartnerGym(gymId) {
  // Activate virtual partner gym membership
  AppState.isPartnerDiscountActive = true;
  AppState.currentGym = VIRTUAL_PARTNER_GYM;
  AppState.lockerNumber = '센텀 온열 #03호';

  // Play audio chime
  playChimeSound();

  // 1. Update In-App Header
  const nameElem = document.getElementById('current-gym-name');
  if (nameElem) nameElem.innerText = VIRTUAL_PARTNER_GYM.name;
  const badgeElem = document.getElementById('partner-status-badge');
  if (badgeElem) badgeElem.style.display = 'inline-flex';

  // 2. Update In-App Banner (Sub 6)
  const banner = document.getElementById('partner-benefit-banner');
  if (banner) {
    banner.classList.add('active-partner');
  }
  const tagElem = document.getElementById('partner-banner-tag');
  if (tagElem) {
    tagElem.className = 'partner-badge-chip active';
    tagElem.innerHTML = `<i class="fa-solid fa-circle-check"></i> 제휴 헬스장 인증 완료`;
  }
  const titleElem = document.getElementById('partner-banner-title');
  if (titleElem) {
    titleElem.innerHTML = `${VIRTUAL_PARTNER_GYM.shortName} <span class="highlight">10% 회원 할인</span> 적용 중!`;
  }
  const descElem = document.getElementById('partner-banner-desc');
  if (descElem) {
    descElem.innerText = `● 전 메뉴 10% 자동 할인 적용 · 스마트 온열 락커 잔여 6석 우선 배정`;
  }
  const ctaElem = document.getElementById('partner-banner-cta-text');
  if (ctaElem) {
    ctaElem.innerText = `제휴 락커 현황 및 지도 확인`;
  }

  // 3. Update Diagnostics Sidebar
  const simGym = document.getElementById('sim-debug-gym');
  if (simGym) simGym.innerText = '루틴제로 센텀 제휴점';
  const simBenefit = document.getElementById('sim-debug-benefit');
  if (simBenefit) {
    simBenefit.innerText = '10% 자동할인 (적용 중)';
    simBenefit.style.color = 'var(--brand-olive)';
  }
  const simLocker = document.getElementById('sim-debug-locker');
  if (simLocker) simLocker.innerText = '온열 락커 #03호 (55℃)';

  // 4. Update Tracker View locker label if already open
  const trackerLocker = document.querySelector('.locker-number-badge');
  if (trackerLocker) trackerLocker.innerText = '센텀 제휴점 온열 락커 #03호';

  // 5. Update Order Modal price if open
  updateModalFinalPrice();

  // 6. Close Map Modal
  closeGymMapModal();

  // 7. Show In-App Toast
  showToast(`🎉 ${VIRTUAL_PARTNER_GYM.shortName} 매칭 완료! 전 메뉴 10% 할인이 적용됩니다.`);
}

function handleGymSearch(query) {
  renderGymMarkers(currentFilterDistrict, query);
}

function filterGymMarkers(district, element) {
  currentFilterDistrict = district;
  document.querySelectorAll('.gym-chip').forEach(c => c.classList.remove('active'));
  if (element) element.classList.add('active');

  const searchInput = document.getElementById('gym-search-kw');
  if (searchInput) searchInput.value = '';

  renderGymMarkers(district);

  if (district === 'partner' || district === '해운대구') {
    if (gymMapInstance) gymMapInstance.setView([35.1702, 129.1298], 15);
    showGymDetail(VIRTUAL_PARTNER_GYM);
  } else if (district === '부산진구') {
    if (gymMapInstance) gymMapInstance.setView([35.1536, 129.0588], 14);
  } else if (district === '수영구') {
    if (gymMapInstance) gymMapInstance.setView([35.1573, 129.1274], 14);
  } else {
    if (gymMapInstance) gymMapInstance.setView([35.1702, 129.1298], 12);
  }
}

function showToast(msg) {
  const existing = document.querySelector('.app-toast-alert');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'app-toast-alert';
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--brand-lime); font-size: 16px;"></i><span>${msg}</span>`;
  
  const stage = document.querySelector('.device-screen');
  if (stage) {
    stage.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3800);
  }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  // Load saved stats
  const saved = localStorage.getItem('routine0_stats');
  if (saved) {
    try {
      AppState.stats = JSON.parse(saved);
    } catch (e) {}
  }
  
  startRealtimeClock();
  renderMenuGrid();
  calculatePickupETA();
  showScreen('screen-home');
});
