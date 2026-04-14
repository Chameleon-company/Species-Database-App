import TheDrawer from "../Components/drawer";
import MainTableSelect from "../mainTableSelect";
import MainTableSelectTetum from "../mainTableSelectTetum";
import { useState } from "react";
import type { Species } from "../mainTableSelect";

export function Home() {
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [selectedSpeciesTetum, setSelectedSpeciesTetum] =
    useState<Species | null>(null);
  const [activeTab, setActiveTab] = useState<"english" | "tetum">("english");

  const handleRowSelect = (rowData: Species | null) =>
    setSelectedSpecies(rowData);
  const handleRowSelectTetum = (rowData: Species | null) =>
    setSelectedSpeciesTetum(rowData);

  const fields: { key: keyof Species; label: string; icon: string }[] = [
    { key: "species_id", label: "Species ID", icon: "#" },
    { key: "scientific_name", label: "Scientific Name", icon: "🔬" },
    { key: "common_name", label: "Common Name", icon: "🌿" },
    { key: "leaf_type", label: "Leaf Type", icon: "🍃" },
    { key: "fruit_type", label: "Fruit Type", icon: "🍑" },
    { key: "etymology", label: "Etymology", icon: "📖" },
    { key: "habitat", label: "Habitat", icon: "🌍" },
    { key: "identification_character", label: "ID Character", icon: "🔍" },
    { key: "phenology", label: "Phenology", icon: "📅" },
    { key: "seed_germination", label: "Seed Germination", icon: "🌱" },
    { key: "pest", label: "Pests", icon: "🐛" },
  ];

  const renderDetailPanel = (species: Species | null) => {
    if (!species) return null;
    return (
      <div className="detail-panel">
        <div className="detail-header">
          <div className="detail-title-row">
            <span className="detail-badge">Selected Species</span>
            <h3 className="detail-sci-name">{species.scientific_name}</h3>
            <span className="detail-common">{species.common_name}</span>
          </div>
        </div>
        <div className="detail-grid">
          {fields.slice(2).map(({ key, label, icon }) => {
            const val = species[key];
            if (!val) return null;
            return (
              <div className="detail-card" key={key}>
                <span className="detail-card-icon">{icon}</span>
                <span className="detail-card-label">{label}</span>
                <span className="detail-card-value">{String(val)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`

                :root {
                    --green-dark:   #2d6a0a;
                    --green-mid:    #4a8f1f;
                    --green-light:  #a8d580;
                    --green-pale:   #eef7e6;
                    --green-border: #d0eab8;
                    --text-dark:    #1a2e10;
                    --text-mid:     #3d5a2a;
                    --text-muted:   #7a9464;
                    --white:        #ffffff;
                    --surface:      #f7fbf2;
                    --radius:       14px;
                }

                /* ── Page header ── */
                .page-header {
                    background: var(--white);
                    border-bottom: 1px solid var(--green-border);
                    padding: 28px 40px 20px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .page-title {
                    font-family: 'Lora', serif;
                    font-size: 28px;
                    font-weight: 600;
                    color: var(--text-dark);
                    line-height: 1.2;
                    margin: 0;
                }

                .page-subtitle {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin: 4px 0 0;
                    font-weight: 400;
                }

                .header-accent {
                    display: inline-block;
                    width: 36px;
                    height: 4px;
                    background: linear-gradient(90deg, var(--green-mid), var(--green-light));
                    border-radius: 4px;
                    margin-bottom: 8px;
                }

                /* ── Tab switcher ── */
                .tab-bar {
                    display: flex;
                    gap: 4px;
                    background: var(--green-pale);
                    border: 1px solid var(--green-border);
                    border-radius: 10px;
                    padding: 4px;
                }

                .tab-btn {
                    padding: 8px 22px;
                    border: none;
                    border-radius: 7px;
                    font-size: 13px;
                    font-weight: 600;
                    font-family: 'DM Sans', sans-serif;
                    cursor: pointer;
                    transition: all 0.18s;
                    color: var(--text-muted);
                    background: transparent;
                }

                .tab-btn.active {
                    background: var(--white);
                    color: var(--green-dark);
                    box-shadow: 0 1px 6px rgba(45,106,10,0.12);
                }

                .tab-btn:not(.active):hover {
                    color: var(--text-mid);
                    background: rgba(255,255,255,0.5);
                }

                /* ── Section wrapper ── */
                .section {
                    padding: 28px 40px 0;
                    animation: fadeUp 0.3s ease both;
                }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .section-label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 14px;
                }

                .section-label-text {
                    font-family: 'Lora', serif;
                    font-size: 16px;
                    font-weight: 500;
                    color: var(--text-mid);
                    font-style: italic;
                }

                .section-label-line {
                    flex: 1;
                    height: 1px;
                    background: var(--green-border);
                }

                /* ── Table wrapper ── */
                .table-wrap {
                    background: var(--white);
                    border: 1px solid var(--green-border);
                    border-radius: var(--radius);
                    overflow: hidden;
                    box-shadow: 0 2px 12px rgba(45,106,10,0.07);
                }

                /* Override MUI DataGrid to match brand */
                .table-wrap .MuiDataGrid-root {
                    border: none !important;
                    font-family: 'DM Sans', sans-serif !important;
                }

                .table-wrap .MuiDataGrid-columnHeaders {
                    background: var(--green-pale) !important;
                    border-bottom: 1px solid var(--green-border) !important;
                }

                .table-wrap .MuiDataGrid-columnHeaderTitle {
                    font-weight: 600 !important;
                    font-size: 12px !important;
                    color: var(--text-mid) !important;
                    letter-spacing: 0.03em;
                    text-transform: uppercase;
                }

                .table-wrap .MuiDataGrid-row:hover {
                    background: var(--green-pale) !important;
                }

                .table-wrap .MuiDataGrid-row.Mui-selected {
                    background: #dff0c8 !important;
                }

                .table-wrap .MuiDataGrid-cell {
                    font-size: 13.5px !important;
                    color: var(--text-dark) !important;
                    border-bottom: 1px solid #f0f7e8 !important;
                }

                .table-wrap .MuiCheckbox-root.Mui-checked {
                    color: var(--green-mid) !important;
                }

                .table-wrap .MuiDataGrid-footerContainer {
                    border-top: 1px solid var(--green-border) !important;
                    background: var(--green-pale) !important;
                }

                /* ── Detail panel ── */
                .detail-panel {
                    margin-top: 20px;
                    background: var(--white);
                    border: 1px solid var(--green-border);
                    border-radius: var(--radius);
                    overflow: hidden;
                    box-shadow: 0 2px 14px rgba(45,106,10,0.08);
                    animation: fadeUp 0.25s ease both;
                }

                .detail-header {
                    background: linear-gradient(135deg, var(--green-dark) 0%, var(--green-mid) 100%);
                    padding: 20px 28px;
                }

                .detail-title-row {
                    display: flex;
                    align-items: baseline;
                    gap: 14px;
                    flex-wrap: wrap;
                }

                .detail-badge {
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    background: rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.9);
                    padding: 3px 10px;
                    border-radius: 20px;
                }

                .detail-sci-name {
                    font-family: 'Lora', serif;
                    font-style: italic;
                    font-size: 20px;
                    font-weight: 500;
                    color: #ffffff;
                    margin: 0;
                }

                .detail-common {
                    font-size: 13px;
                    color: rgba(255,255,255,0.75);
                    font-weight: 500;
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 1px;
                    background: var(--green-border);
                }

                .detail-card {
                    background: var(--white);
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    transition: background 0.15s;
                }

                .detail-card:hover { background: var(--green-pale); }

                .detail-card-icon {
                    font-size: 16px;
                    line-height: 1;
                }

                .detail-card-label {
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--text-muted);
                }

                .detail-card-value {
                    font-size: 13px;
                    color: var(--text-dark);
                    line-height: 1.5;
                    font-weight: 400;
                }

                /* ── Responsive ── */
                @media (max-width: 768px) {
                    .home-root { margin-left: 0; }
                    .page-header { padding: 20px; }
                    .section { padding: 20px 16px 0; }
                    .page-title { font-size: 22px; }
                }
            `}</style>

      <TheDrawer />

      <div className="home-root">
        {/* ── Page header ── */}
        <div className="page-header">
          <div>
            <div className="header-accent" />
            <h1 className="page-title">Species Database Dashboard</h1>
            <p className="page-subtitle">
              Browse and manage the English &amp; Tetum species records
            </p>
          </div>

          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === "english" ? "active" : ""}`}
              onClick={() => setActiveTab("english")}
            >
              🌿 English
            </button>
            <button
              className={`tab-btn ${activeTab === "tetum" ? "active" : ""}`}
              onClick={() => setActiveTab("tetum")}
            >
              🌏 Tetum
            </button>
          </div>
        </div>

        {/* ── English tab ── */}
        {activeTab === "english" && (
          <div className="section">
            <div className="section-label">
              <span className="section-label-text">English Database</span>
              <div className="section-label-line" />
            </div>
            <div className="table-wrap">
              <MainTableSelect onRowSelect={handleRowSelect} lang="en" />
            </div>
            {renderDetailPanel(selectedSpecies)}
          </div>
        )}

        {/* ── Tetum tab ── */}
        {activeTab === "tetum" && (
          <div className="section">
            <div className="section-label">
              <span className="section-label-text">Tetum Database</span>
              <div className="section-label-line" />
            </div>
            <div className="table-wrap">
              <MainTableSelectTetum onRowSelect={handleRowSelectTetum} lang="tet" />
            </div>
            {renderDetailPanel(selectedSpeciesTetum)}
          </div>
        )}
      </div>
    </>
  );
}
