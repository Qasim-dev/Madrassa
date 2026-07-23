import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { uiLang } from "../shared/localized";
import { getInstitutionName } from "../shared/institutionBrand";
import { useGetDashboardStatsQuery, useGetMeQuery } from "../services/api";
import PageHeading from "../components/PageHeading";
import NavIcon from "../components/NavIcon";
import { AppTabPanel } from "../components/AppTabs";
import AppKpiCards from "../components/ui/AppKpiCards";
import DashboardAttendanceCharts from "../components/DashboardAttendanceCharts";

function mapTilesToKpi(tiles, t, openHint) {
  return tiles.map((tile) => ({
    key: tile.to,
    to: tile.to,
    label: t(tile.labelKey),
    value: tile.count,
    hint: tile.countLabel,
    tone: tile.tone,
    featured: tile.featured,
    icon: <NavIcon name={tile.icon} />,
    actionLabel: `${openHint} →`,
  }));
}

/**
 * Main dashboard: summary stats + tabbed quick entry (aligned with madrassa admin workflow).
 */
export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = uiLang(i18n.language);
  const activeSessionId = useSelector((s) => s.session.activeSessionId);
  const { data: me } = useGetMeQuery();
  const { data, isLoading } = useGetDashboardStatsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
  );
  const [panel, setPanel] = useState("new");

  if (isLoading) {
    return (
      <div className="content-panel p-5 text-center text-secondary">
        <div
          className="spinner-border text-success"
          role="status"
          aria-hidden
        />
        <p className="mt-3 mb-0">{t("common.loading")}</p>
      </div>
    );
  }

  const lng = i18n.language;
  const institutionName = getInstitutionName(me, lng) || t("app.title");
  const teachers = data?.totalTeachers ?? 0;
  const students = data?.totalStudents ?? 0;
  const saToday = data?.studentAttendanceSessionsToday ?? 0;
  const taToday = data?.teacherAttendanceRecordsToday ?? 0;
  const fin = data?.finance;
  const byDarja = data?.attendanceByGrade ?? [];
  const openHint = t("dashboard.openHint");

  const countLabelTotal = lng === "ur" ? "کل" : "Total";
  const countLabelToday = lng === "ur" ? "آج" : "Today";

  const peopleTiles = [
    {
      to: "/students/new",
      labelKey: "dashboard.tileNewStudent",
      icon: "students",
      tone: "teal",
      featured: true,
      count: students,
      countLabel: countLabelTotal,
    },
    {
      to: "/students",
      labelKey: "dashboard.tileStudents",
      icon: "students",
      tone: "sky",
      count: students,
      countLabel: countLabelTotal,
    },
    {
      to: "/teachers",
      labelKey: "dashboard.tileTeachers",
      icon: "teachers",
      tone: "orange",
      count: teachers,
      countLabel: countLabelTotal,
    },
    {
      to: "/grades",
      labelKey: "dashboard.tileNewGrade",
      icon: "grades",
      tone: "emerald",
      count: data?.totalDarjahs ?? data?.totalGrades ?? 0,
      countLabel: countLabelTotal,
    },
    {
      to: "/tartibat/sessions",
      labelKey: "dashboard.tileSessions",
      icon: "tartibat",
      tone: "slate",
      count: data?.totalSessions ?? 0,
      countLabel: countLabelTotal,
    },
  ];

  const operationsTiles = [
    {
      to: "/attendance?tab=student",
      labelKey: "dashboard.tileStudentAttendance",
      icon: "attendance",
      tone: "rose",
      count: saToday,
      countLabel: countLabelToday,
    },
    {
      to: "/attendance?tab=teacher",
      labelKey: "dashboard.tileTeacherAttendance",
      icon: "attendance",
      tone: "amber",
      count: taToday,
      countLabel: countLabelToday,
    },
    {
      to: "/exams",
      labelKey: "dashboard.tileExams",
      icon: "exams",
      tone: "indigo",
      count: data?.totalExams ?? 0,
      countLabel: countLabelTotal,
    },
    {
      to: "/tartibat/timetable",
      labelKey: "dashboard.tileTimetable",
      icon: "timetable",
      tone: "cyan",
      count: data?.totalTimetableEntries ?? 0,
      countLabel: countLabelTotal,
    },
    {
      to: "/book-reading",
      labelKey: "dashboard.tileBookReading",
      icon: "bookReading",
      tone: "emerald",
      count: data?.bookReadingToday ?? 0,
      countLabel: countLabelToday,
    },
  ];

  const financeTiles = [
    {
      to: "/fees",
      labelKey: "dashboard.tileFees",
      icon: "fees",
      tone: "cyan",
      count: data?.totalFeeItems ?? 0,
      countLabel: countLabelTotal,
    },
    {
      to: "/finance",
      labelKey: "dashboard.tileFinance",
      icon: "finance",
      tone: "violet",
      count: fin?.transactionCount ?? 0,
      countLabel: countLabelTotal,
    },
    {
      to: "/inventory",
      labelKey: "nav.inventory",
      icon: "inventory",
      tone: "slate",
      count: data?.totalInventory ?? 0,
      countLabel: countLabelTotal,
    },
    {
      to: "/library",
      labelKey: "nav.library",
      icon: "library",
      tone: "teal",
      count: data?.totalLibraryBooks ?? 0,
      countLabel: countLabelTotal,
    },
  ];

  const miscTiles = [
    { to: "/profile", labelKey: "nav.profile", icon: "profile", tone: "slate" },
    {
      to: "/tartibat/subjects",
      labelKey: "nav.tartibatSubjects",
      icon: "tartibat",
      tone: "slate",
      count: data?.totalSubjects ?? 0,
      countLabel: countLabelTotal,
    },
    {
      to: "/tartibat/books",
      labelKey: "nav.tartibatBooks",
      icon: "bookReading",
      tone: "slate",
      count: data?.totalSubjectBooks ?? 0,
      countLabel: countLabelTotal,
    },
  ];

  const statCards = [
    {
      key: "teachers",
      label: t("nav.teachers"),
      value: teachers,
      tone: "orange",
      to: "/teachers",
      icon: "teachers",
    },
    {
      key: "students",
      label: t("dashboard.statTotalStudents"),
      value: students,
      tone: "teal",
      to: "/students",
      icon: "students",
    },
    {
      key: "sa",
      label:
        lng === "ur"
          ? "آج طلباء حاضری (شیٹیں)"
          : "Student attendance (sheets today)",
      value: saToday,
      tone: "cyan",
      to: "/attendance?tab=student",
      icon: "attendance",
    },
    {
      key: "ta",
      label: lng === "ur" ? "آج اساتذہ کے اندراج" : "Teacher marks (today)",
      value: taToday,
      tone: "rose",
      to: "/attendance?tab=teacher",
      icon: "attendance",
    },
  ];

  const tabs = [
    { id: "new", label: t("dashboard.tabNew") },
    { id: "ops", label: t("dashboard.tabOperations") },
    { id: "finance", label: t("dashboard.tabFinance") },
    { id: "all", label: t("dashboard.tabAllStudents") },
    { id: "misc", label: t("dashboard.tabMisc") },
  ];

  const activeTiles =
    panel === "new"
      ? peopleTiles
      : panel === "ops"
        ? operationsTiles
        : panel === "finance"
          ? financeTiles
          : panel === "misc"
            ? miscTiles
            : [];

  return (
    <div className="dashboard-page">
      <PageHeading navKey="navDashboard">
        <p
          className="text-secondary small mt-3 mb-0 leading-relaxed"
          lang={lang}
        >
          {institutionName}
        </p>
      </PageHeading>

      <div
        className="dashboard-overview-banner rounded-4 px-3 px-md-4 py-3 mb-4 text-white shadow-sm"
        lang={lang}
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="min-w-0">
            <div
              className="small fw-semibold text-uppercase opacity-90 mb-1"
              style={{ letterSpacing: "0.08em" }}
            >
              {lng === "ur" ? "عمومی جائزہ" : "Overview"}
            </div>
            <p className="mb-0 small opacity-95 leading-relaxed">
              {activeSessionId ? (
                <>
                  {lng === "ur"
                    ? "اعداد و شمار اور چارٹز اوپر والے ہیڈر میں منتخب کردہ سیشن کے مطابق ہیں۔"
                    : "Figures and charts reflect the session selected in the header."}
                </>
              ) : (
                <>
                  {lng === "ur"
                    ? "تمام سیشنز کا مجموعی ڈیٹا۔ فلٹر کے لیے اوپر ہیڈر میں سیشن منتخب کریں۔"
                    : "Combined data for all sessions. Pick a session in the header to filter."}
                </>
              )}
            </p>
          </div>
          <div className="dashboard-overview-banner__accent rounded-3 px-3 py-2 small mb-0 text-center text-md-end">
            <span className="opacity-90 d-block">
              {t("dashboard.hintTodayAttendance", { sa: saToday, ta: taToday })}
            </span>
            {fin ? (
              <span className="opacity-90 d-block mt-1">
                {t("dashboard.hintFinance", {
                  income: fin.totalIncome ?? 0,
                  expense: fin.totalExpenses ?? 0,
                })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <AppKpiCards
        items={statCards.map((card) => ({
          key: card.key,
          to: card.to,
          label: card.label,
          value: card.value,
          tone: card.tone,
          icon: <NavIcon name={card.icon} />,
          actionLabel: `${openHint} →`,
        }))}
        columns={4}
      />
      <AppTabPanel
        tabs={tabs}
        value={panel}
        onChange={setPanel}
        lang={lng}
        ariaLabel={t("nav.dashboard")}
        variant="pills"
        tabsFullWidth
        tabsClassName="dashboard-tabs-bar"
        className="dashboard-tab-panel mb-4"
      >
        {activeTiles.length > 0 && (
          <AppKpiCards
            className="mb-0"
            columns="auto"
            items={mapTilesToKpi(activeTiles, t, openHint)}
          />
        )}

        {panel === "all" && (
          <div className="text-center py-4 px-2">
            <p className="text-secondary mb-4" lang={lang}>
              {t("dashboard.allStudentsLead")}
            </p>
            <Link to="/students" className="btn btn-success">
              {t("dashboard.openStudentsRegister")}
            </Link>
          </div>
        )}
      </AppTabPanel>
      {byDarja.length > 0 && (
        <div className="content-panel dashboard-chart-panel p-0 overflow-hidden mb-4 shadow-sm">
          <div className="dashboard-chart-panel__head px-3 px-md-4 py-3 border-bottom border-secondary-subtle">
            <h2 className="h6 mb-0 fw-semibold text-slate-800" lang={lang}>
              {t("dashboard.attendanceByDarjaTitle")}
            </h2>
            <p className="small text-secondary mb-0 mt-1" lang={lang}>
              {t("dashboard.attendanceByDarjaHint")}
            </p>
          </div>
          <DashboardAttendanceCharts byDarja={byDarja} lng={lng} t={t} />
        </div>
      )}
    </div>
  );
}
