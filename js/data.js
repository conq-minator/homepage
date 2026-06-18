// js/data.js

export const siteConfig = {
  websiteName: "Physics Virtual Laboratory",
  university: "University of Engineering & Management",
  institute: "Institute of Engineering & Management",
  department: "Physics Laboratory",
  subDepartment: "Department of Basic Science & Humanities (BSH)",
  campus: "IEM Salt Lake Campus",
  academicYear: "2026",
  heroSubtitle: "Interactive Physics Experiments for Engineering Students",
  heroDescription: "Welcome to the Physics Virtual Laboratory developed by the Physics Laboratory, Department of Basic Science & Humanities, Institute of Engineering & Management (IEM), Salt Lake Campus. This platform enables engineering students to perform realistic virtual physics experiments, promoting conceptual understanding through immersive digital laboratory experiences.",
  mentor: {
    name: "Prof. Subarna Datta",
    department: "Department of Basic Science & Humanities (Physics)",
    institute: "Institute of Engineering & Management (IEM)",
    campus: "Salt Lake Campus",
    quote: "This Physics Virtual Laboratory has been conceptualized and developed under the academic guidance and mentorship of Prof. Subarna Datta. The objective of this platform is to provide engineering students with an interactive, realistic, and accessible environment for performing physics experiments digitally, thereby enhancing conceptual understanding and laboratory learning."
  },
  contact: {
    email: "contact@iem.edu", // Placeholder
    phone: "+91 0000000000",   // Placeholder
    website: "https://iem.edu"
  }
};

export const experiments = [
  {
    id: 1,
    folder: "newtons-ring",
    title: "Determine the Radius of Curvature of Plano-Convex Lens by Newton's Ring Method",
    shortDesc: "Study interference patterns to calculate the radius of curvature.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-target"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    contributors: [
      { name: "Prashun Kumar Roy", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Chandrajit Saha", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 2,
    folder: "youngs-modulus",
    title: "Determine Young's Modulus of a Rectangular Metallic Beam",
    shortDesc: "Measure the bending of a beam to find its elasticity.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ruler"><path d="M21.3 15.3l-2.6 2.6a1 1 0 0 1-1.4 0l-12-12a1 1 0 0 1 0-1.4l2.6-2.6a1 1 0 0 1 1.4 0l12 12a1 1 0 0 1 0 1.4z"/><path d="M14.5 5.5l2 2"/><path d="M10.5 9.5l2 2"/><path d="M6.5 13.5l2 2"/></svg>`,
    contributors: [
      { name: "Meghneel Ghosh", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Amrito Rupam Ghosh", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 3,
    folder: "rigidity-static",
    title: "Determine the Modulus of Rigidity of a Rod by Static Method",
    shortDesc: "Investigate torsional rigidity using the static torsion apparatus.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cylinder"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/></svg>`,
    contributors: [
      { name: "Kamalika Chakraborty", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Rohit Chakraborty", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Soumik Bhuniya", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 4,
    folder: "laser-diffraction",
    title: "Determine the Wavelength of Laser Light by Diffraction Method",
    shortDesc: "Use a diffraction grating to calculate the wavelength of a laser.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    contributors: [
      { name: "Animesh Adhikari", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Ankansubho Dutta", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Subhasis Roy", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 5,
    folder: "solar-cell",
    title: "Study Characteristics of a Solar Cell",
    shortDesc: "Analyze the V-I characteristics and power output of a solar cell.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-battery-charging"><path d="M15 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><path d="M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"/><path d="m11 7-3 5h4l-3 5"/><line x1="22" x2="22" y1="11" y2="13"/></svg>`,
    contributors: [
      { name: "Ujaan Mukherjee", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 6,
    folder: "four-probe",
    title: "Determine the Band Gap of a Semiconductor by Four Probe Method",
    shortDesc: "Measure resistivity at various temperatures to find the band gap.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cpu"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
    contributors: [
      { name: "Sohini Chakraborty", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Afiya Tanzeel", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Kritika Paul", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Srijani Mavri", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Swapnanil Ghosh", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 7,
    folder: "frank-hertz",
    title: "Find the Excitation Potential of Argon Atom using Frank-Hertz Experiment",
    shortDesc: "Demonstrate quantization of energy levels in atoms.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    contributors: [
      { name: "Meghnath Chatterjee", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Sayan Samanta", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Debraj Paul", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 8,
    folder: "rigidity-dynamic",
    title: "Determine the Modulus of Rigidity of a Metallic Wire by Dynamic Method",
    shortDesc: "Use a torsional pendulum to find the modulus of rigidity dynamically.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-vertical"><path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/></svg>`,
    contributors: [
      { name: "Koyel Bandyopadhyay", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Sattwik Modak", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Ashmit Bhadra", role: "Contributor", linkedin: "", portfolio: "" },
      { name: "Sangita Kanta", role: "Contributor", linkedin: "", portfolio: "" }
    ]
  },
  {
    id: 9,
    folder: "ydse",
    title: "Young's Double Slit Experiment (YDSE)",
    shortDesc: "Interference Lab to measure light wavelengths and slit separations.",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-waves"><path d="M2 6c.6 0 1.2-.2 1.8-.6 1.2-.8 2.4-1.4 3.6-1.4s2.4.6 3.6 1.4c.6.4 1.2.6 1.8.6s1.2-.2 1.8-.6C15.8 4.6 17 4 18.2 4s2.4.6 3.6 1.4c.6.4 1.2.6 1.8.6"/><path d="M2 12c.6 0 1.2-.2 1.8-.6 1.2-.8 2.4-1.4 3.6-1.4s2.4.6 3.6 1.4c.6.4 1.2.6 1.8.6s1.2-.2 1.8-.6C15.8 10.6 17 10 18.2 10s2.4.6 3.6 1.4c.6.4 1.2.6 1.8.6"/><path d="M2 18c.6 0 1.2-.2 1.8-.6 1.2-.8 2.4-1.4 3.6-1.4s2.4.6 3.6 1.4c.6.4 1.2.6 1.8.6s1.2-.2 1.8-.6C15.8 16.6 17 16 18.2 16s2.4.6 3.6 1.4c.6.4 1.2.6 1.8.6"/></svg>`,
    contributors: []
  }
];
