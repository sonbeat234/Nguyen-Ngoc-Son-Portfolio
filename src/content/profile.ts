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

  // ---- trang chi tiết (mở khi bấm card: chế độ sách / cuộn). Mọi trường được để rỗng → khối skeleton "to be added" ----
  /** đoạn URL, vd "mini-ic-tester" → #project/mini-ic-tester. Rỗng → "die-01", "die-02"… theo thứ tự */
  slug: string;
  /** ảnh bìa trong public/, vd "/img/projects/tester-cover.webp" (webp, ngang ~1600px) */
  cover: string;
  /** 2–3 câu tóm tắt dự án */
  summary: string;
  /** bài toán / bối cảnh cần giải quyết */
  problem: string;
  /** cách làm, mỗi bước một trang sách / một khối khi cuộn; image tuỳ chọn */
  approach: { title: string; text: string; image?: string }[];
  /** số liệu kết quả, vd { label: "Yield", value: "96.4 %" } — số trong value tự đếm lên */
  metrics: { label: string; value: string }[];
  /** hình ảnh (webp) + chú thích */
  gallery: { src: string; caption: string }[];
  /** bài học rút ra, mỗi phần tử một ý */
  lessons: string[];
  /** link liên quan THẬT (repo, báo cáo, video…) */
  links: { label: string; href: string }[];
};

/** dự án chưa có nội dung: mọi trường rỗng (card + trang chi tiết hiện skeleton "to be added") */
export function emptyProject(): Project {
  return {
    title: "", objective: "", tools: [], role: "", outcome: "", period: "", link: "",
    slug: "", cover: "", summary: "", problem: "", approach: [], metrics: [], gallery: [], lessons: [], links: [],
  };
}

export type SkillGroup = {
  /** TODO: nhóm kỹ năng, vd "HDL", "EDA tools", "Scripting", "Analog / layout" */
  group: string;
  /** TODO: kỹ năng thật trong nhóm, vd ["Verilog", "SystemVerilog"] */
  items: string[];
};

export type Education = {
  /** cấp học, hiện dạng nhãn nhỏ trên timeline CV, vd "University", "High school" */
  level?: string;
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
  highSchool: "Le Quy Don High School for the Gifted, Lai Chau",
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
      level: "University",
      school: "FPT University, Hanoi",
      program: "", // TODO: ngành học chính xác
      period: "", // TODO: năm bắt đầu – kết thúc / "present"
      notes: [], // TODO: GPA, môn chuyên ngành tiêu biểu, đồ án…
    },
    {
      level: "High school",
      school: "Le Quy Don High School for the Gifted, Lai Chau",
      program: "", // TODO (tuỳ chọn): lớp chuyên, vd "Specialised class: Mathematics"
      period: "", // TODO: năm học, vd "2021 – 2024"
      notes: [],
    },
  ] as Education[],

  /** TODO: thay 3 ô trống bằng dự án thật (xem type Project ở trên và ví dụ đầy đủ trong README). Có thể thêm/bớt phần tử. */
  projects: [emptyProject(), emptyProject(), emptyProject()] as Project[],

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

  /**
   * Liên hệ THẬT (đã xác nhận). Hiện ở footer (End of line — email có nút Copy), đầu CV, mục "Contact" trong menu,
   * và readout trang đầu (2 link https đầu tiên, chỉ hiện handle — thay chỗ IELTS/TOEIC cũ).
   * Icon tự chọn theo href: mailto → thư, tel → điện thoại, linkedin.com, github.com. Mảng rỗng → không hiện gì.
   */
  contact: [
    { label: "Email", value: "ngocson02082006@gmail.com", href: "mailto:ngocson02082006@gmail.com" },
    { label: "LinkedIn", value: "linkedin.com/in/ngocson2006", href: "https://www.linkedin.com/in/ngocson2006/" },
    { label: "GitHub", value: "github.com/sonbeat234", href: "https://github.com/sonbeat234" },
  ] as ContactLink[],
};

export const isFilled = (v: string | string[]) => (Array.isArray(v) ? v.length > 0 : v.trim().length > 0);

/** escape trước khi chèn chuỗi người dùng vào innerHTML */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** slug dùng trong URL (#project/<slug>): profile.projects[i].slug hoặc "die-01"… */
export const projectSlug = (p: Project, i: number) =>
  (p.slug.trim() || `die-${String(i + 1).padStart(2, "0")}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
