import { useLanguage } from "../LanguageContext";
import { translations } from "../translations";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  const t = (key: string) => (translations as any)[key]?.[lang] || key;

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 22px",
    border: "none",
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    transition: "all 0.18s",
    color: active ? "#2d6a0a" : "#7a9464",
    background: active ? "#ffffff" : "transparent",
    boxShadow: active ? "0 1px 6px rgba(45,106,10,0.12)" : "none",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "#eef3e7",
        borderRadius: 12,
        padding: 4,
        gap: 4,
      }}
    >
      <button onClick={() => setLang("en")} style={buttonStyle(lang === "en")}>
        🌿 {t("english")}
      </button>

      <button onClick={() => setLang("tet")} style={buttonStyle(lang === "tet")}>
        🌏 {t("tetum")}
      </button>
    </div>
  );
}