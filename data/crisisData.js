/**
 * UN GeoInsight — Crisis Dataset
 * Sources: UN FTS 2024, CBPF Data Hub, HRP/HNO, WHO Health Cluster Reports
 * All financial figures in USD billions unless noted.
 * BB Ratio = USD per beneficiary (budget ÷ beneficiaries)
 */

window.CRISIS_DATA = [
  {
    id: "SD", name: "Sudan", iso_a2: "SD", iso_a3: "SDN",
    lat: 15.5, lng: 32.5,
    crisis_type: "conflict",
    crisis_desc: "Conflict / Mass Displacement",
    severity: "critical", inform_score: 8.1,
    // Funding
    pin: 24.8,           // people in need (millions)
    requirements: 2.70,  // USD billions
    funded: 0.63,
    cbpf: true, cbpf_alloc: 54, cbpf_req: 200,
    // Healthcare
    health_workers_per_10k: 1.8,
    functional_facilities_pct: 38,
    health_cluster_funded_pct: 21,
    cold_chain_coverage_pct: 28,
    active_outbreaks: ["Cholera", "Malaria"],
    med_stockout_risk: "critical",
    // Cluster breakdown (% of HRP budget)
    clusters: [
      {n:"Food Security", p:38, color:"#ff7926"},
      {n:"Health",        p:22, color:"#3d9eff"},
      {n:"WASH",          p:15, color:"#00d68f"},
      {n:"Shelter",       p:14, color:"#ffd84a"},
      {n:"Protection",    p:11, color:"#9d6fff"}
    ],
    note: "World's largest displacement crisis. 25M displaced. CBPF critically under-resourced relative to scale. Health system at <40% functionality.",
  },
  {
    id: "ET", name: "Ethiopia", iso_a2: "ET", iso_a3: "ETH",
    lat: 9.1, lng: 40.5,
    crisis_type: "conflict", crisis_desc: "Conflict / Food Crisis / Drought",
    severity: "critical", inform_score: 7.9,
    pin: 21.0, requirements: 3.50, funded: 1.10,
    cbpf: true, cbpf_alloc: 78, cbpf_req: 280,
    health_workers_per_10k: 2.1, functional_facilities_pct: 52,
    health_cluster_funded_pct: 29, cold_chain_coverage_pct: 41,
    active_outbreaks: ["Malaria", "Measles", "Kala-azar"],
    med_stockout_risk: "high",
    clusters: [
      {n:"Food Security", p:42, color:"#ff7926"},
      {n:"Health",        p:20, color:"#3d9eff"},
      {n:"WASH",          p:16, color:"#00d68f"},
      {n:"Nutrition",     p:12, color:"#ffd84a"},
      {n:"Education",     p:10, color:"#9d6fff"}
    ],
    note: "Tigray aftermath plus ongoing Amhara conflict compound food insecurity and health system collapse.",
  },
  {
    id: "CD", name: "DRC", iso_a2: "CD", iso_a3: "COD",
    lat: -4.0, lng: 22.0,
    crisis_type: "conflict", crisis_desc: "Protracted Conflict / Displacement",
    severity: "critical", inform_score: 8.2,
    pin: 25.4, requirements: 2.60, funded: 0.72,
    cbpf: true, cbpf_alloc: 112, cbpf_req: 350,
    health_workers_per_10k: 1.3, functional_facilities_pct: 31,
    health_cluster_funded_pct: 19, cold_chain_coverage_pct: 22,
    active_outbreaks: ["Mpox", "Cholera", "Ebola (risk)", "Malaria"],
    med_stockout_risk: "critical",
    clusters: [
      {n:"Food Security", p:36, color:"#ff7926"},
      {n:"Health",        p:24, color:"#3d9eff"},
      {n:"Protection",    p:18, color:"#9d6fff"},
      {n:"WASH",          p:13, color:"#00d68f"},
      {n:"Shelter",       p:9,  color:"#ffd84a"}
    ],
    note: "World's largest mpox outbreak. 25M food insecure. Among lowest health funding per capita globally.",
  },
  {
    id: "YE", name: "Yemen", iso_a2: "YE", iso_a3: "YEM",
    lat: 15.5, lng: 48.5,
    crisis_type: "conflict", crisis_desc: "Conflict / Economic Collapse",
    severity: "critical", inform_score: 8.0,
    pin: 18.2, requirements: 2.70, funded: 1.00,
    cbpf: true, cbpf_alloc: 95, cbpf_req: 220,
    health_workers_per_10k: 3.1, functional_facilities_pct: 50,
    health_cluster_funded_pct: 34, cold_chain_coverage_pct: 35,
    active_outbreaks: ["Cholera", "Dengue"],
    med_stockout_risk: "high",
    clusters: [
      {n:"Food Security", p:40, color:"#ff7926"},
      {n:"Health",        p:21, color:"#3d9eff"},
      {n:"WASH",          p:17, color:"#00d68f"},
      {n:"Protection",    p:12, color:"#9d6fff"},
      {n:"Nutrition",     p:10, color:"#ffd84a"}
    ],
    note: "Funding reduced 60% since 2022. 17M food insecure. 50% of health facilities partially functional.",
  },
  {
    id: "AF", name: "Afghanistan", iso_a2: "AF", iso_a3: "AFG",
    lat: 33.9, lng: 67.7,
    crisis_type: "displacement", crisis_desc: "Political Crisis / Food Insecurity",
    severity: "critical", inform_score: 8.5,
    pin: 23.7, requirements: 3.20, funded: 1.50,
    cbpf: true, cbpf_alloc: 130, cbpf_req: 300,
    health_workers_per_10k: 4.5, functional_facilities_pct: 61,
    health_cluster_funded_pct: 41, cold_chain_coverage_pct: 49,
    active_outbreaks: ["Measles", "Polio", "Malaria"],
    med_stockout_risk: "high",
    clusters: [
      {n:"Food Security", p:35, color:"#ff7926"},
      {n:"Health",        p:25, color:"#3d9eff"},
      {n:"Shelter",       p:15, color:"#ffd84a"},
      {n:"WASH",          p:14, color:"#00d68f"},
      {n:"Education",     p:11, color:"#9d6fff"}
    ],
    note: "Taliban restrictions limit women-led NGO health delivery. Polio remains endemic.",
  },
  {
    id: "SY", name: "Syria", iso_a2: "SY", iso_a3: "SYR",
    lat: 34.8, lng: 38.9,
    crisis_type: "conflict", crisis_desc: "Protracted Conflict",
    severity: "high", inform_score: 7.7,
    pin: 16.7, requirements: 4.07, funded: 1.67,
    cbpf: true, cbpf_alloc: 88, cbpf_req: 160,
    health_workers_per_10k: 5.2, functional_facilities_pct: 58,
    health_cluster_funded_pct: 38, cold_chain_coverage_pct: 44,
    active_outbreaks: ["Cholera"],
    med_stockout_risk: "moderate",
    clusters: [
      {n:"Food Security", p:32, color:"#ff7926"},
      {n:"WASH",          p:22, color:"#00d68f"},
      {n:"Shelter",       p:20, color:"#ffd84a"},
      {n:"Health",        p:16, color:"#3d9eff"},
      {n:"Protection",    p:10, color:"#9d6fff"}
    ],
    note: "Relatively higher funding but cross-line access constraints remain severe in health delivery.",
  },
  {
    id: "SO", name: "Somalia", iso_a2: "SO", iso_a3: "SOM",
    lat: 5.1, lng: 46.2,
    crisis_type: "food", crisis_desc: "Food Crisis / Conflict / Drought",
    severity: "critical", inform_score: 8.3,
    pin: 7.8, requirements: 1.60, funded: 0.54,
    cbpf: true, cbpf_alloc: 68, cbpf_req: 140,
    health_workers_per_10k: 0.9, functional_facilities_pct: 26,
    health_cluster_funded_pct: 17, cold_chain_coverage_pct: 18,
    active_outbreaks: ["Cholera", "Measles", "Malaria"],
    med_stockout_risk: "critical",
    clusters: [
      {n:"Food Security", p:44, color:"#ff7926"},
      {n:"WASH",          p:18, color:"#00d68f"},
      {n:"Health",        p:18, color:"#3d9eff"},
      {n:"Nutrition",     p:12, color:"#ffd84a"},
      {n:"Protection",    p:8,  color:"#9d6fff"}
    ],
    note: "Lowest health worker density in dataset (0.9/10k vs WHO minimum 23). Extremely high ratio anomaly.",
  },
  {
    id: "SS", name: "South Sudan", iso_a2: "SS", iso_a3: "SSD",
    lat: 6.8, lng: 31.3,
    crisis_type: "conflict", crisis_desc: "Conflict / Flooding / Displacement",
    severity: "critical", inform_score: 8.4,
    pin: 9.4, requirements: 1.70, funded: 0.58,
    cbpf: true, cbpf_alloc: 58, cbpf_req: 130,
    health_workers_per_10k: 1.1, functional_facilities_pct: 29,
    health_cluster_funded_pct: 18, cold_chain_coverage_pct: 15,
    active_outbreaks: ["Cholera", "Malaria", "Hepatitis E"],
    med_stockout_risk: "critical",
    clusters: [
      {n:"Food Security", p:41, color:"#ff7926"},
      {n:"Health",        p:20, color:"#3d9eff"},
      {n:"WASH",          p:16, color:"#00d68f"},
      {n:"Protection",    p:13, color:"#9d6fff"},
      {n:"Shelter",       p:10, color:"#ffd84a"}
    ],
    note: "One of the most underfunded crises relative to IPC severity. Cold chain coverage only 15%.",
  },
  {
    id: "MM", name: "Myanmar", iso_a2: "MM", iso_a3: "MMR",
    lat: 19.1, lng: 96.7,
    crisis_type: "conflict", crisis_desc: "Military Coup / Internal Conflict",
    severity: "high", inform_score: 7.8,
    pin: 18.6, requirements: 0.994, funded: 0.24,
    cbpf: true, cbpf_alloc: 32, cbpf_req: 90,
    health_workers_per_10k: 6.7, functional_facilities_pct: 44,
    health_cluster_funded_pct: 22, cold_chain_coverage_pct: 31,
    active_outbreaks: ["Dengue", "Malaria"],
    med_stockout_risk: "high",
    clusters: [
      {n:"Food Security", p:30, color:"#ff7926"},
      {n:"Health",        p:26, color:"#3d9eff"},
      {n:"Protection",    p:20, color:"#9d6fff"},
      {n:"WASH",          p:14, color:"#00d68f"},
      {n:"Shelter",       p:10, color:"#ffd84a"}
    ],
    note: "Severely overlooked. 24% funded. Junta restricts humanitarian access. Health cluster most impacted.",
  },
  {
    id: "HT", name: "Haiti", iso_a2: "HT", iso_a3: "HTI",
    lat: 18.9, lng: -72.3,
    crisis_type: "conflict", crisis_desc: "Gang Violence / Political Crisis",
    severity: "high", inform_score: 7.5,
    pin: 5.5, requirements: 0.674, funded: 0.22,
    cbpf: true, cbpf_alloc: 28, cbpf_req: 65,
    health_workers_per_10k: 3.9, functional_facilities_pct: 41,
    health_cluster_funded_pct: 26, cold_chain_coverage_pct: 33,
    active_outbreaks: ["Cholera"],
    med_stockout_risk: "high",
    clusters: [
      {n:"Food Security", p:33, color:"#ff7926"},
      {n:"Health",        p:22, color:"#3d9eff"},
      {n:"WASH",          p:18, color:"#00d68f"},
      {n:"Protection",    p:17, color:"#9d6fff"},
      {n:"Shelter",       p:10, color:"#ffd84a"}
    ],
    note: "Gang control of 80% of Port-au-Prince severely limits health facility access and supply chains.",
  },
  {
    id: "CF", name: "CAR", iso_a2: "CF", iso_a3: "CAF",
    lat: 7.0, lng: 20.9,
    crisis_type: "conflict", crisis_desc: "Protracted Conflict / Displacement",
    severity: "critical", inform_score: 8.6,
    pin: 3.4, requirements: 0.594, funded: 0.18,
    cbpf: true, cbpf_alloc: 25, cbpf_req: 55,
    health_workers_per_10k: 0.7, functional_facilities_pct: 22,
    health_cluster_funded_pct: 14, cold_chain_coverage_pct: 11,
    active_outbreaks: ["Malaria", "Measles", "Mpox"],
    med_stockout_risk: "critical",
    clusters: [
      {n:"Food Security", p:35, color:"#ff7926"},
      {n:"Health",        p:22, color:"#3d9eff"},
      {n:"Protection",    p:20, color:"#9d6fff"},
      {n:"WASH",          p:13, color:"#00d68f"},
      {n:"Shelter",       p:10, color:"#ffd84a"}
    ],
    note: "Lowest health worker density globally (0.7/10k). Media invisibility keeps funding critically low. Cold chain at 11%.",
  },
  {
    id: "MZ", name: "Mozambique", iso_a2: "MZ", iso_a3: "MOZ",
    lat: -18.6, lng: 35.5,
    crisis_type: "climate", crisis_desc: "Cyclone / Climate / Conflict (Cabo Delgado)",
    severity: "high", inform_score: 7.2,
    pin: 2.0, requirements: 0.409, funded: 0.18,
    cbpf: true, cbpf_alloc: 21, cbpf_req: 45,
    health_workers_per_10k: 4.1, functional_facilities_pct: 55,
    health_cluster_funded_pct: 31, cold_chain_coverage_pct: 46,
    active_outbreaks: ["Cholera", "Malaria"],
    med_stockout_risk: "moderate",
    clusters: [
      {n:"Food Security", p:30, color:"#ff7926"},
      {n:"WASH",          p:22, color:"#00d68f"},
      {n:"Health",        p:18, color:"#3d9eff"},
      {n:"Shelter",       p:18, color:"#ffd84a"},
      {n:"Protection",    p:12, color:"#9d6fff"}
    ],
    note: "Cabo Delgado insurgency combined with cyclone impacts create compounded medical supply crisis.",
  },
  {
    id: "UA", name: "Ukraine", iso_a2: "UA", iso_a3: "UKR",
    lat: 49.0, lng: 31.5,
    crisis_type: "conflict", crisis_desc: "Armed Conflict / Displacement",
    severity: "high", inform_score: 6.8,
    pin: 14.6, requirements: 4.28, funded: 3.09,
    cbpf: false, cbpf_alloc: 0, cbpf_req: 0,
    health_workers_per_10k: 29.8, functional_facilities_pct: 74,
    health_cluster_funded_pct: 68, cold_chain_coverage_pct: 71,
    active_outbreaks: [],
    med_stockout_risk: "low",
    clusters: [
      {n:"Shelter",       p:28, color:"#ffd84a"},
      {n:"Food Security", p:25, color:"#ff7926"},
      {n:"Health",        p:20, color:"#3d9eff"},
      {n:"Protection",    p:15, color:"#9d6fff"},
      {n:"WASH",          p:12, color:"#00d68f"}
    ],
    note: "Comparatively well-funded (72%). Serves as contrast case. Strong health infrastructure despite conflict.",
  },
  {
    id: "PS", name: "Gaza / OPT", iso_a2: "PS", iso_a3: "PSE",
    lat: 31.5, lng: 34.45,
    crisis_type: "conflict", crisis_desc: "Armed Conflict / Blockade",
    severity: "critical", inform_score: 9.1,
    pin: 2.2, requirements: 1.20, funded: 0.48,
    cbpf: false, cbpf_alloc: 0, cbpf_req: 0,
    health_workers_per_10k: 8.1, functional_facilities_pct: 16,
    health_cluster_funded_pct: 31, cold_chain_coverage_pct: 9,
    active_outbreaks: ["Hepatitis A", "Diarrhoeal disease"],
    med_stockout_risk: "critical",
    clusters: [
      {n:"Food Security", p:35, color:"#ff7926"},
      {n:"Health",        p:28, color:"#3d9eff"},
      {n:"WASH",          p:17, color:"#00d68f"},
      {n:"Shelter",       p:12, color:"#ffd84a"},
      {n:"Protection",    p:8,  color:"#9d6fff"}
    ],
    note: "Highest INFORM score (9.1). Only 16% of health facilities functional. Cold chain near-collapse at 9%.",
  },
  {
    id: "TD", name: "Chad", iso_a2: "TD", iso_a3: "TCD",
    lat: 15.3, lng: 18.7,
    crisis_type: "displacement", crisis_desc: "Refugee Hosting / Food Insecurity",
    severity: "high", inform_score: 7.6,
    pin: 7.3, requirements: 0.87, funded: 0.29,
    cbpf: true, cbpf_alloc: 42, cbpf_req: 95,
    health_workers_per_10k: 1.5, functional_facilities_pct: 37,
    health_cluster_funded_pct: 22, cold_chain_coverage_pct: 27,
    active_outbreaks: ["Cholera", "Meningitis", "Malaria"],
    med_stockout_risk: "high",
    clusters: [
      {n:"Food Security", p:38, color:"#ff7926"},
      {n:"Health",        p:20, color:"#3d9eff"},
      {n:"WASH",          p:18, color:"#00d68f"},
      {n:"Shelter",       p:14, color:"#ffd84a"},
      {n:"Protection",    p:10, color:"#9d6fff"}
    ],
    note: "Hosts 1M+ refugees from Sudan. Meningitis belt country. Health system severely under strain.",
  },
  {
    id: "NG", name: "Nigeria", iso_a2: "NG", iso_a3: "NGA",
    lat: 10.0, lng: 8.7,
    crisis_type: "food", crisis_desc: "Conflict (NE) / Food Crisis",
    severity: "high", inform_score: 7.0,
    pin: 8.3, requirements: 1.10, funded: 0.44,
    cbpf: true, cbpf_alloc: 52, cbpf_req: 110,
    health_workers_per_10k: 8.2, functional_facilities_pct: 62,
    health_cluster_funded_pct: 36, cold_chain_coverage_pct: 52,
    active_outbreaks: ["Cholera", "Lassa Fever", "Meningitis"],
    med_stockout_risk: "moderate",
    clusters: [
      {n:"Food Security", p:40, color:"#ff7926"},
      {n:"Health",        p:18, color:"#3d9eff"},
      {n:"WASH",          p:17, color:"#00d68f"},
      {n:"Nutrition",     p:14, color:"#ffd84a"},
      {n:"Protection",    p:11, color:"#9d6fff"}
    ],
    note: "Lake Chad basin crisis chronically underreported. Lassa Fever endemic in conflict-affected NE.",
  },
  {
    id: "BF", name: "Burkina Faso", iso_a2: "BF", iso_a3: "BFA",
    lat: 12.4, lng: -1.5,
    crisis_type: "conflict", crisis_desc: "Jihadist Conflict / Displacement",
    severity: "critical", inform_score: 7.9,
    pin: 6.3, requirements: 0.62, funded: 0.17,
    cbpf: true, cbpf_alloc: 22, cbpf_req: 60,
    health_workers_per_10k: 3.3, functional_facilities_pct: 34,
    health_cluster_funded_pct: 16, cold_chain_coverage_pct: 23,
    active_outbreaks: ["Malaria", "Meningitis", "Dengue"],
    med_stockout_risk: "critical",
    clusters: [
      {n:"Food Security", p:42, color:"#ff7926"},
      {n:"WASH",          p:18, color:"#00d68f"},
      {n:"Health",        p:16, color:"#3d9eff"},
      {n:"Shelter",       p:14, color:"#ffd84a"},
      {n:"Protection",    p:10, color:"#9d6fff"}
    ],
    note: "Fastest growing displacement crisis in Africa. 27% funded. Jihadist control limits health access.",
  },
  {
    id: "BD", name: "Bangladesh (Cox's Bazar)", iso_a2: "BD", iso_a3: "BGD",
    lat: 22.0, lng: 91.5,
    crisis_type: "displacement", crisis_desc: "Rohingya Refugee Crisis",
    severity: "moderate", inform_score: 5.8,
    pin: 0.95, requirements: 0.876, funded: 0.49,
    cbpf: false, cbpf_alloc: 0, cbpf_req: 0,
    health_workers_per_10k: 11.2, functional_facilities_pct: 68,
    health_cluster_funded_pct: 52, cold_chain_coverage_pct: 61,
    active_outbreaks: ["Dengue"],
    med_stockout_risk: "low",
    clusters: [
      {n:"Shelter",       p:30, color:"#ffd84a"},
      {n:"Food Security", p:25, color:"#ff7926"},
      {n:"Health",        p:20, color:"#3d9eff"},
      {n:"WASH",          p:15, color:"#00d68f"},
      {n:"Education",     p:10, color:"#9d6fff"}
    ],
    note: "Comparatively better funded but Rohingya face statelessness and mental health crisis.",
  },
  {
    id: "ML", name: "Mali", iso_a2: "ML", iso_a3: "MLI",
    lat: 17.6, lng: -3.9,
    crisis_type: "conflict", crisis_desc: "Sahel Conflict / Food Crisis",
    severity: "high", inform_score: 7.4,
    pin: 8.8, requirements: 0.75, funded: 0.23,
    cbpf: true, cbpf_alloc: 30, cbpf_req: 70,
    health_workers_per_10k: 1.8, functional_facilities_pct: 39,
    health_cluster_funded_pct: 21, cold_chain_coverage_pct: 28,
    active_outbreaks: ["Malaria", "Meningitis"],
    med_stockout_risk: "high",
    clusters: [
      {n:"Food Security", p:39, color:"#ff7926"},
      {n:"WASH",          p:19, color:"#00d68f"},
      {n:"Health",        p:17, color:"#3d9eff"},
      {n:"Protection",    p:14, color:"#9d6fff"},
      {n:"Shelter",       p:11, color:"#ffd84a"}
    ],
    note: "UN staff expelled by junta limits health response. 30% funded. Meningitis belt with critical vaccine gaps.",
  },
  {
    id: "VE", name: "Venezuela", iso_a2: "VE", iso_a3: "VEN",
    lat: 8.0, lng: -66.0,
    crisis_type: "displacement", crisis_desc: "Political Crisis / Economic Collapse",
    severity: "moderate", inform_score: 6.2,
    pin: 7.1, requirements: 0.35, funded: 0.18,
    cbpf: false, cbpf_alloc: 0, cbpf_req: 0,
    health_workers_per_10k: 12.4, functional_facilities_pct: 55,
    health_cluster_funded_pct: 44, cold_chain_coverage_pct: 48,
    active_outbreaks: ["Malaria", "Measles"],
    med_stockout_risk: "moderate",
    clusters: [
      {n:"Food Security", p:32, color:"#ff7926"},
      {n:"Health",        p:26, color:"#3d9eff"},
      {n:"WASH",          p:18, color:"#00d68f"},
      {n:"Protection",    p:14, color:"#9d6fff"},
      {n:"Shelter",       p:10, color:"#ffd84a"}
    ],
    note: "7M+ displaced externally. Regional response underfunded. Measles re-emergence post vaccine collapse.",
  },
];

// Derive computed fields
window.CRISIS_DATA.forEach(d => {
  d.funding_pct    = (d.funded / d.requirements) * 100;
  d.gap_usd        = d.requirements - d.funded;
  d.budget_per_bene = ((d.funded * 1e9) / (d.pin * 1e6)).toFixed(0); // $ per person in need
  d.cbpf_coverage  = d.cbpf ? (d.cbpf_alloc / d.cbpf_req * 100).toFixed(1) : 0;
  // Flag anomaly: health cluster funded < 25% AND health workers below WHO minimum (23/10k)
  d.health_anomaly = d.health_cluster_funded_pct < 25 && d.health_workers_per_10k < 5;
  d.alert_level    = d.funding_pct < 30 ? 'critical'
                   : d.funding_pct < 50 ? 'high'
                   : d.funding_pct < 70 ? 'moderate' : 'funded';
  d.who_gap        = Math.max(0, 86 - (d.funded * 1e9 * (d.health_cluster_funded_pct/100)) / (d.pin * 1e6)); // $ gap vs WHO $86/person min
});

// Global summary constants
window.GLOBAL_STATS = {
  total_requirements: 49.47,
  total_funded: 23.96,
  total_pin: 305,
  cbpf_active: 19,
  cbpf_total_alloc: 1.03,
  year: 2024,
  sources: [
    "UN Financial Tracking Service (FTS) 2024",
    "CBPF Data Hub — OCHA 2024",
    "WHO Health Cluster Reports 2023/24",
    "Humanitarian Needs Overviews (HNO) 2024",
    "INFORM Risk Index 2024",
  ]
};
