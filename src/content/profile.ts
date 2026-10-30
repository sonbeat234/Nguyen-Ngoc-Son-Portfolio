// Nội dung cá nhân của portfolio — NGUỒN DUY NHẤT. Hero, Profile, Projects, CV và footer đều đọc từ đây.
// Quy tắc: chỉ điền thông tin thật. Trường để chuỗi rỗng "" / mảng rỗng [] sẽ hiện dạng ô trống
// (skeleton) trên web và bị ẩn khỏi bản in CV, không bao giờ hiện chữ bịa.

export type Project = {
  /** TODO: tên dự án, vd "8-bit RISC CPU in SystemVerilog" */
  title: string;
  /** TODO: mục tiêu / bài toán dự án giải quyết (1–2 câu) */
  objective: string;
  /** TODO: công nghệ, ngôn ngữ, công cụ EDA, vd ["SystemVerilog", "Vivado", "ModelSim"] */
  tools: string[];
  /** TODO: vai trò của bạn, vd "RTL design & verification (individual)" */
  role: string;
  /** TODO: kết quả đo được, vd "Fmax 120 MHz on Artix-7, 100% functional coverage" */
  outcome: string;
  /** TODO: thời gian, vd "2025" hoặc "Sep – Dec 2025" */
  period: string;
  /** TODO (tuỳ chọn): link repo / báo cáo THẬT. Để "" thì không hiện nút. */
  link: string;
};

export type SkillGroup = {
  /** TODO: nhóm kỹ năng, vd "HDL", "EDA tools", "Scripting", "Analog / layout" */
  group: string;
  /** TODO: kỹ năng thật trong nhóm, vd ["Verilog", "SystemVerilog"] */
  items: string[];
};

export type Education = {
  school: string;
  /** TODO: ngành / chương trình, vd "B.Eng. in Integrated Circuit Design" */
  program: string;
  /** TODO: thời gian, vd "2024 – present" */
  period: string;
  /** TODO (tuỳ chọn): GPA, môn tiêu biểu, đồ án… — mỗi phần tử một dòng */
  notes: string[];
};

export type ContactLink = {
  /** vd "Email", "LinkedIn", "GitHub" */
  label: string;
  /** chuỗi hiển thị, vd "name@example.com" */
  value: string;
  /** href thật: "mailto:…", "https://…" */
  href: string;
};

export type Score = { label: string; value: number; max: number; text: string };

export const profile = {
  // ---- thông tin đã xác nhận (hiển thị nguyên văn) ----
  fullName: "Nguyễn Ngọc Sơn",
  dateOfBirth: "2nd August 2006",
  education: "FPT University, Hanoi",
  ielts: "6.0",
  toeic: "750",

  /** lĩnh vực portfolio hướng tới (dòng phụ dưới tên trong CV) */
  field: "IC Design · Semiconductor",

  /**
   * Ảnh chân dung. TODO: chép ảnh thật vào `public/img/portrait.webp` (khuyên dùng 4:5, cạnh dài ≥ 800px)
   * rồi đặt portrait: "/img/portrait.webp". Để "" thì khung hiện placeholder "Portrait — to be added".
   */
  portrait: "",

  /**
   * File CV thật để tải về. TODO: chép PDF vào `public/cv/Nguyen-Ngoc-Son-CV.pdf` rồi đặt
   * cvFile: "/cv/Nguyen-Ngoc-Son-CV.pdf". Để "" thì KHÔNG hiện nút Download (chỉ có nút In / Lưu PDF).
   */
  cvFile: "",

  /**
   * Tóm tắt Profile trong CV — bản nháp trung tính chỉ dựa trên thông tin đã cung cấp.
   * TODO: viết lại bằng giọng của bạn (mục tiêu nghề nghiệp, mảng quan tâm: digital / analog / verification…).
   */
  summary:
    "Building toward a career in integrated circuit design, with a focus on how a specification becomes working silicon. " +
    "Educated at FPT University, Hanoi. English: IELTS 6.0, TOEIC 750.",

  educationEntries: [
    {
      school: "FPT University, Hanoi",
      program: "", // TODO: ngành học chính xác
      period: "", // TODO: năm bắt đầu – kết thúc / "present"
      notes: [], // TODO: GPA, môn chuyên ngành tiêu biểu, đồ án…
    },
  ] as Education[],

  /** TODO: thay 3 ô trống bằng dự án thật (xem type Project ở trên). Có thể thêm/bớt phần tử. */
  projects: [
    { title: "", objective: "", tools: [], role: "", outcome: "", period: "", link: "" },
    { title: "", objective: "", tools: [], role: "", outcome: "", period: "", link: "" },
    { title: "", objective: "", tools: [], role: "", outcome: "", period: "", link: "" },
  ] as Project[],

  /** TODO: điền kỹ năng thật theo nhóm. Mảng rỗng → CV hiện các ô trống. */
  skills: [] as SkillGroup[],

  /** TODO: thêm ngôn ngữ khác nếu muốn (vd tiếng Việt). Chỉ ghi điểm/chứng chỉ thật. */
  languages: [
    {
      name: "English",
      scores: [
        { label: "IELTS", value: 6.0, max: 9, text: "6.0" },
        { label: "TOEIC", value: 750, max: 990, text: "750" },
      ] as Score[],
    },
  ],

  /** TODO: chỉ thêm liên hệ THẬT (email, LinkedIn, GitHub…). Mảng rỗng → không hiện nút liên hệ nào. */
  contact: [] as ContactLink[],
};

export const isFilled = (v: string | string[]) => (Array.isArray(v) ? v.length > 0 : v.trim().length > 0);

/** escape trước khi chèn chuỗi người dùng vào innerHTML */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
