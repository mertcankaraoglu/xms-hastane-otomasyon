import { defineMcp } from "@lovable.dev/mcp-js";
import { withLog } from "./run";
import listDepartments from "./tools/list-departments";
import getDepartment from "./tools/get-department";
import searchDoctors from "./tools/search-doctors";
import getDoctorProfile from "./tools/get-doctor-profile";
import getHospitalInfo from "./tools/get-hospital-info";
import searchKnowledge from "./tools/search-knowledge";
import getAvailableSlots from "./tools/get-available-slots";
import bookAppointment from "./tools/book-appointment";
import manageAppointment from "./tools/manage-appointment";

export default defineMcp({
  name: "xms-hastane-otomasyon",
  title: "Xms Hastane Otomasyon",
  version: "1.0.0",
  instructions: [
    "Medicare Hastanesi (Kadıköy/İstanbul) için bilgi ve randevu araçları. Tüm saatler Europe/Istanbul (UTC+3).",
    "Hastane hakkındaki sorularda search_knowledge veya get_hospital_info sonuçlarına dayanın; bilgi yoksa uydurmayın, çağrı merkezine (0216 000 00 00) yönlendirin.",
    "Teşhis koymayın, ilaç önermeyin. Göğüs ağrısı, nefes darlığı, bilinç kaybı, felç belirtisi veya ciddi kanamada hemen 112'yi aramasını söyleyin.",
    "Randevu akışı: list_departments/search_doctors → get_available_slots → ad soyad, 11 haneli TC, 0 ile başlayan 11 haneli telefon toplayın → özetleyip açık onay alın → book_appointment. Kodu kullanıcıya verin.",
    "İptal için manage_appointment(action=cancel) çağırmadan önce mutlaka onay alın.",
  ].join("\n"),
  tools: [listDepartments, getDepartment, searchDoctors, getDoctorProfile, getHospitalInfo, searchKnowledge, getAvailableSlots, bookAppointment, manageAppointment].map(withLog),
});
