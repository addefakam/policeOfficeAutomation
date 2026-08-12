import sys, os

PDF_SKILL_DIR = os.path.join(os.path.dirname(__file__), '..', 'skills', 'pdf')
_scripts = os.path.join(PDF_SKILL_DIR, 'scripts')
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.colors import HexColor

# --- Font Registration ---
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('Inter', f'{FONT_DIR}/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSerif-Bold.ttf'))
registerFontFamily('Inter', normal='Inter', bold='Inter-Bold')

# --- Color Palette ---
PAGE_BG       = HexColor('#f5f4f5')
SECTION_BG    = HexColor('#edecee')
CARD_BG       = HexColor('#e7e3e9')
TABLE_STRIPE  = HexColor('#f1eff2')
HEADER_FILL   = HexColor('#5b4368')
COVER_BLOCK   = HexColor('#704e81')
BORDER        = HexColor('#c3bac7')
ICON          = HexColor('#67417b')
ACCENT        = HexColor('#8638ad')
TEXT_PRIMARY   = HexColor('#1e1c1f')
TEXT_MUTED     = HexColor('#88828c')

# --- Page dimensions ---
PAGE_W, PAGE_H = A4
MARGIN = 1.0 * inch
CONTENT_W = PAGE_W - 2 * MARGIN

# --- Output paths ---
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
BODY_PDF = os.path.join(OUTPUT_DIR, 'proposal_body.pdf')
FINAL_PDF = os.path.join(OUTPUT_DIR, 'Police_Department_Automation_Proposal.pdf')

# --- Styles ---
style_h1 = ParagraphStyle(
    'CustomH1', fontName='Inter-Bold', fontSize=22, leading=28,
    spaceAfter=12, spaceBefore=20, textColor=HEADER_FILL,
)
style_h2 = ParagraphStyle(
    'CustomH2', fontName='Inter-Bold', fontSize=16, leading=22,
    spaceAfter=8, spaceBefore=14, textColor=ICON,
)
style_h3 = ParagraphStyle(
    'CustomH3', fontName='Inter-Bold', fontSize=13, leading=18,
    spaceAfter=6, spaceBefore=10, textColor=TEXT_PRIMARY,
)
style_body = ParagraphStyle(
    'CustomBody', fontName='Inter', fontSize=11, leading=17,
    spaceAfter=8, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
)
style_table_header = ParagraphStyle(
    'TableHeader', fontName='Inter-Bold', fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER,
)
style_table_cell = ParagraphStyle(
    'TableCell', fontName='Inter', fontSize=9.5, leading=13,
    textColor=TEXT_PRIMARY, wordWrap='CJK',
)

# --- Helpers ---
def heading1(t): return Paragraph(t, style_h1)
def heading2(t): return Paragraph(t, style_h2)
def heading3(t): return Paragraph(t, style_h3)
def body(t): return Paragraph(t, style_body)
def spacer(h=12): return Spacer(1, h)

def accent_line():
    return HRFlowable(width="100%", thickness=1.5, lineCap='round',
                       color=ACCENT, spaceAfter=12, spaceBefore=6)

def make_table(data, col_widths=None):
    if col_widths is None:
        n = len(data[0])
        col_widths = [CONTENT_W / n] * n
    assert sum(col_widths) <= CONTENT_W + 0.5
    wrapped = []
    for ri, row in enumerate(data):
        wr = []
        for cell in row:
            st = style_table_header if ri == 0 else style_table_cell
            wr.append(Paragraph(str(cell), st))
        wrapped.append(wr)
    tbl = Table(wrapped, colWidths=col_widths, repeatRows=1)
    cmds = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            cmds.append(('BACKGROUND', (0,i), (-1,i), TABLE_STRIPE))
    tbl.setStyle(TableStyle(cmds))
    return tbl

# ====================================================================
# Build Story
# ====================================================================
story = []

# --- TOC ---
story.append(heading1("Table of Contents"))
story.append(accent_line())
story.append(spacer(6))

toc_entries = [
    ("1", "Executive Summary"),
    ("2", "Current Challenges"),
    ("3", "Proposed Solution Overview"),
    ("4", "Module 1: FIR and Case Management"),
    ("5", "Module 2: Staff and Duty Management"),
    ("6", "Module 3: Automated Reporting"),
    ("7", "Module 4: Vehicle and Equipment Tracking"),
    ("8", "Implementation Plan"),
    ("9", "Technology Stack"),
    ("10", "Investment and Payment Terms"),
    ("11", "Why Choose Us"),
    ("12", "Next Steps"),
]
for num, title in toc_entries:
    dots = "." * max(1, 65 - len(f"{num}. {title}"))
    story.append(Paragraph(
        f"<b>{num}.</b>  {title}  <font color='#{TEXT_MUTED.hexval()[2:]}'>{dots}</font>",
        ParagraphStyle('toc', fontName='Inter', fontSize=11, leading=20, spaceBefore=2, spaceAfter=2, leftIndent=10, textColor=TEXT_PRIMARY)
    ))

story.append(PageBreak())

# --- 1. Executive Summary ---
story.append(heading1("1. Executive Summary"))
story.append(accent_line())
story.append(body(
    "This proposal presents a comprehensive digital transformation plan designed to modernize "
    "the operations of the City Police Department. After thorough consultation and analysis of the "
    "department's daily workflows, we have identified critical areas where manual, paper-based processes "
    "are creating bottlenecks, increasing the risk of data loss, and reducing overall operational efficiency. "
    "The current system relies heavily on handwritten registers, manual file tracking, and verbal duty "
    "assignments, all of which are prone to errors, delays, and lack of accountability."
))
story.append(body(
    "We propose an integrated, web-based automation system built around four core modules: "
    "FIR and Case Management, Staff and Duty Management, Automated Reporting, and Vehicle and "
    "Equipment Tracking. Each module addresses a specific operational pain point while seamlessly "
    "connecting with the others to create a unified digital ecosystem. The system is designed to be "
    "user-friendly, secure, and accessible from any web browser, ensuring that officers and administrators "
    "can adopt it with minimal training."
))
story.append(body(
    "The implementation will follow a phased approach over approximately 11 weeks, starting with the "
    "highest-priority FIR and Case Management module. This strategy allows the department to see "
    "tangible results quickly, builds trust in the system, and provides opportunities for feedback "
    "before subsequent modules are deployed. Our commitment extends beyond delivery to include ongoing "
    "technical support, staff training, and future scalability as the department's needs evolve."
))
story.append(PageBreak())

# --- 2. Current Challenges ---
story.append(heading1("2. Current Challenges"))
story.append(accent_line())
story.append(body(
    "Through detailed discussions with department leadership and frontline officers, we have "
    "identified four primary areas where the absence of digital systems is significantly impacting "
    "the department's ability to serve the community effectively. These challenges are not unique "
    "to this department; they are common across many law enforcement agencies that still rely on "
    "traditional manual processes. However, the good news is that modern, affordable technology "
    "solutions can address each of these challenges comprehensively."
))

story.append(heading2("2.1 Paper-Based Case Records"))
story.append(body(
    "The department currently registers First Information Reports (FIRs) and tracks criminal cases "
    "using handwritten registers and physical files. This creates several serious problems: files can "
    "be misplaced or damaged over time, searching for a specific case requires manually flipping through "
    "hundreds of pages, and there is no way to quickly generate statistics about crime trends or "
    "case outcomes. When a senior officer or judicial authority requests case status information, "
    "staff must physically locate the file, which can take hours or even days. This delays "
    "decision-making and undermines the department's ability to respond promptly to inquiries."
))

story.append(heading2("2.2 Manual Staff and Duty Management"))
story.append(body(
    "Officers' attendance, duty assignments, leave records, and shift schedules are managed "
    "through a combination of attendance books, verbal instructions, and informal notes. This leads "
    "to frequent confusion about who is on duty at any given time, disputes over leave balances, "
    "and difficulty in ensuring adequate coverage during peak periods or emergencies. There is no "
    "centralized record that can be referenced quickly, making it hard for supervisors to plan "
    "staffing effectively or to account for overtime hours accurately."
))

story.append(heading2("2.3 Time-Consuming Report Generation"))
story.append(body(
    "Daily, weekly, and monthly reports are compiled manually by collecting data from various "
    "handwritten sources and typing them into documents. This process is extremely labor-intensive, "
    "prone to transcription errors, and often results in reports being submitted late. Management "
    "lacks real-time visibility into key performance indicators such as crime rates by category, "
    "case resolution rates, and officer productivity metrics. Without automated dashboards and "
    "one-click report generation, leadership cannot make data-driven decisions quickly."
))

story.append(heading2("2.4 Vehicle and Equipment Tracking Gaps"))
story.append(body(
    "The department maintains a fleet of patrol vehicles and various equipment items, but there is "
    "no centralized digital system to track their status, assignment, maintenance history, or fuel "
    "consumption. Vehicles are sometimes double-booked, maintenance schedules are missed, and "
    "equipment loss or misplacement goes undetected for extended periods. This not only wastes "
    "department resources but can also compromise operational readiness when vehicles or critical "
    "equipment are unavailable during emergencies."
))
story.append(PageBreak())

# --- 3. Proposed Solution Overview ---
story.append(heading1("3. Proposed Solution Overview"))
story.append(accent_line())
story.append(body(
    "We propose an integrated, web-based Police Automation System that addresses all four "
    "challenge areas through a cohesive digital platform. The system will be accessible from any "
    "computer or mobile device with a web browser, eliminating the need for expensive specialized "
    "hardware or software installations. All data will be stored securely on a local server within "
    "the department's premises, ensuring that sensitive law enforcement data never leaves the "
    "department's physical control."
))
story.append(body(
    "The platform follows a modular architecture, meaning each functional area operates as an "
    "independent module that can be deployed and used on its own, while also sharing data and "
    "integrating seamlessly with the other modules. This approach provides several advantages: it "
    "allows the department to prioritize which modules to deploy first, it limits the impact of "
    "any single module issue on the rest of the system, and it makes it straightforward to add "
    "new modules in the future as needs evolve."
))

overview_data = [
    ["Module", "Primary Function", "Key Users", "Priority"],
    ["FIR and Case Management", "Digital FIR registration, case tracking, evidence linking, status monitoring", "Station Commander, Investigators, Clerks", "Phase 1"],
    ["Staff and Duty Management", "Attendance, duty rosters, leave management, shift scheduling", "HR Officer, Supervisors, All Officers", "Phase 2"],
    ["Automated Reporting", "One-click daily/weekly/monthly reports, dashboards, analytics", "Command Staff, Management, Analysts", "Phase 2"],
    ["Vehicle and Equipment Tracking", "Fleet registry, assignment, maintenance scheduling, inventory", "Logistics Officer, Fleet Manager", "Phase 3"],
]
col_w = [CONTENT_W * 0.22, CONTENT_W * 0.38, CONTENT_W * 0.22, CONTENT_W * 0.18]
story.append(spacer(6))
story.append(KeepTogether([heading3("System Module Overview"), make_table(overview_data, col_w)]))
story.append(spacer(8))

story.append(heading2("3.1 Core Design Principles"))
story.append(body(
    "The system is built on four foundational principles that guide every design and "
    "development decision. First, <b>Security and Confidentiality</b>: all data is encrypted, "
    "access is controlled through role-based permissions, and audit trails log every action "
    "taken within the system. Second, <b>Simplicity and Usability</b>: the interface is designed "
    "to be intuitive for users with varying levels of technical expertise, with clear labels, "
    "logical navigation, and minimal clicks to complete common tasks."
))
story.append(body(
    "Third, <b>Offline Capability</b>: recognizing that internet connectivity may not always be "
    "reliable, the system is designed to function in offline mode for critical operations, "
    "synchronizing data automatically when connectivity is restored. Fourth, <b>Scalability</b>: "
    "the architecture is designed to accommodate future growth, whether that means adding more "
    "users, integrating with other government systems, or deploying additional functional modules "
    "as the department's digital maturity increases."
))
story.append(PageBreak())

# --- 4. Module 1: FIR & Case Management ---
story.append(heading1("4. Module 1: FIR and Case Management"))
story.append(accent_line())
story.append(body(
    "The FIR and Case Management module is the cornerstone of the entire system and is "
    "therefore prioritized as the first module for deployment. This module transforms the "
    "entire lifecycle of a criminal case from the moment an FIR is registered to its final "
    "resolution, replacing paper-based processes with a fast, searchable, and accountable "
    "digital workflow. Every case will have a unique digital ID that can be used to track its "
    "progress, retrieve its full history, and generate reports instantly."
))

story.append(heading2("4.1 Key Features"))
story.append(body(
    "The module provides a comprehensive digital FIR registration form that captures all "
    "required information including complainant details, incident date and location, crime "
    "category, description of the incident, and names of accused persons if available. Each FIR "
    "is automatically assigned a unique tracking number and timestamp, eliminating the "
    "possibility of duplicate entries or lost records. The system supports the attachment of "
    "scanned documents, photographs, and other digital evidence directly to the case file."
))
story.append(body(
    "Case investigation progress can be updated in real time by assigned officers, with "
    "status changes, notes, and actions all logged with timestamps and user identification. "
    "Supervisors can view the status of all cases under their jurisdiction through a "
    "single dashboard, enabling them to identify stalled cases, allocate resources, and "
    "follow up with investigators proactively. Advanced search and filter functionality "
    "allows staff to locate any case within seconds using criteria such as case number, "
    "date range, crime category, officer name, or current status."
))

fir_features = [
    ["Feature", "Description"],
    ["Digital FIR Registration", "Complete online form with auto-generated case ID, timestamp, and category classification"],
    ["Case Status Tracking", "Real-time status updates (Open, Under Investigation, Closed, Transferred) with full audit trail"],
    ["Evidence Management", "Attach scanned documents, photos, and digital evidence to case files"],
    ["Search and Filter", "Instant search by case number, date, category, location, officer, or status"],
    ["Investigation Notes", "Officers can add chronological notes, actions taken, and observations per case"],
    ["Supervisor Dashboard", "Overview of all cases with color-coded status, pending items, and escalation alerts"],
    ["Case Transfer", "Seamless transfer of cases between officers or stations with full history preserved"],
]
col_w2 = [CONTENT_W * 0.30, CONTENT_W * 0.70]
story.append(KeepTogether([spacer(6), heading3("FIR Module Feature Summary"), make_table(fir_features, col_w2)]))
story.append(PageBreak())

# --- 5. Module 2: Staff & Duty Management ---
story.append(heading1("5. Module 2: Staff and Duty Management"))
story.append(accent_line())
story.append(body(
    "The Staff and Duty Management module brings order and transparency to the department's "
    "most valuable resource: its personnel. This module digitizes the entire cycle of workforce "
    "management, from daily attendance logging to long-term duty scheduling and leave "
    "management. By replacing scattered attendance books and verbal duty assignments with a "
    "centralized digital system, the department can ensure that every officer's time is "
    "accounted for, that duty coverage is always adequate, and that leave balances are "
    "accurate and transparent."
))

story.append(heading2("5.1 Key Features"))
story.append(body(
    "The attendance tracking feature allows officers to check in and check out through a simple "
    "web interface, with the system automatically recording the time and calculating hours worked. "
    "Supervisors can view real-time attendance summaries for their entire team, instantly seeing who "
    "is present, absent, or on leave. The duty roster module enables the designated scheduling officer "
    "to create weekly or monthly duty rosters visually, assigning officers to specific shifts, posts, "
    "or patrol areas. The system automatically flags conflicts such as double-booking or insufficient "
    "rest periods between shifts."
))
story.append(body(
    "Leave management is fully integrated, allowing officers to submit leave requests digitally "
    "and supervisors to approve or reject them with a single click. The system automatically "
    "deducts from the officer's leave balance and updates the duty roster accordingly. "
    "Overtime tracking ensures that extra hours worked are recorded and available for "
    "management review, supporting fair compensation practices. Historical records of "
    "attendance, leave, and duty assignments are maintained indefinitely and can be "
    "retrieved for administrative or disciplinary purposes at any time."
))

staff_features = [
    ["Feature", "Description"],
    ["Digital Attendance", "Check-in/check-out with automatic time logging and daily summary reports"],
    ["Duty Roster Scheduling", "Visual weekly/monthly roster creation with conflict detection and coverage alerts"],
    ["Leave Management", "Digital leave requests, approval workflow, and automatic balance tracking"],
    ["Shift Management", "Define shift types (day, night, patrol), assign officers, and track compliance"],
    ["Overtime Tracking", "Automatic overtime calculation based on attendance records with review reports"],
    ["Personnel Directory", "Complete officer profiles with rank, contact, assignment history, and certifications"],
]
story.append(KeepTogether([spacer(6), heading3("Staff and Duty Module Feature Summary"), make_table(staff_features, col_w2)]))
story.append(PageBreak())

# --- 6. Module 3: Automated Reporting ---
story.append(heading1("6. Module 3: Automated Reporting"))
story.append(accent_line())
story.append(body(
    "The Automated Reporting module transforms the department's ability to generate insights "
    "from its operational data. Instead of spending hours manually compiling reports from "
    "handwritten registers, officers and managers can generate comprehensive, accurate reports "
    "with a single click. This module draws data from all other modules, including FIR records, "
    "staff attendance, and vehicle logs, to produce a unified view of the department's "
    "operational status at any point in time."
))

story.append(heading2("6.1 Key Features"))
story.append(body(
    "The system includes pre-built report templates for the most commonly required reports: "
    "daily crime summaries, weekly operational updates, monthly statistical reports, and "
    "custom date-range analyses. Each report can be generated in PDF or spreadsheet format, "
    "making it easy to print, email, or archive. Reports include visual charts and graphs "
    "that make trends immediately visible, such as crime category distribution over time, "
    "case resolution rates by officer, and comparison of current-period statistics with "
    "previous periods."
))
story.append(body(
    "A real-time management dashboard provides leadership with an at-a-glance view of key "
    "performance indicators: total active cases, cases resolved this month, pending FIRs, "
    "officer attendance rates, and vehicle availability status. The dashboard is accessible "
    "from any device with a web browser, enabling senior officers to monitor department "
    "performance even when they are away from the station. Custom report builders allow "
    "authorized users to create ad-hoc reports by selecting specific data fields, filters, "
    "and display formats, ensuring that the system can adapt to any reporting requirement."
))

report_features = [
    ["Feature", "Description"],
    ["Pre-Built Templates", "Daily crime summary, weekly operations, monthly statistics, custom date-range reports"],
    ["Visual Dashboards", "Real-time KPI dashboard with charts for crime trends, case resolution, and attendance"],
    ["Export Options", "Generate reports in PDF or Excel format for printing, email, or archiving"],
    ["Trend Analysis", "Compare current and previous periods, visualize crime category distributions over time"],
    ["Custom Report Builder", "Select data fields, filters, and formats to create ad-hoc reports on demand"],
    ["Automated Scheduling", "Schedule reports to be generated and distributed automatically at set intervals"],
]
story.append(KeepTogether([spacer(6), heading3("Reporting Module Feature Summary"), make_table(report_features, col_w2)]))
story.append(PageBreak())

# --- 7. Module 4: Vehicle & Equipment ---
story.append(heading1("7. Module 4: Vehicle and Equipment Tracking"))
story.append(accent_line())
story.append(body(
    "The Vehicle and Equipment Tracking module provides the department with complete visibility "
    "and control over its physical assets. From patrol vehicles and motorcycles to radios, "
    "weapons, and other equipment, every item is registered in the system with its complete "
    "profile including make, model, registration number, purchase date, and current condition. "
    "This module eliminates the risk of lost or untracked assets and ensures that maintenance "
    "is performed on schedule, maximizing the lifespan and readiness of department resources."
))

story.append(heading2("7.1 Key Features"))
story.append(body(
    "The vehicle registry maintains a comprehensive record of every vehicle in the fleet, including "
    "registration details, insurance status, and assignment history. When a vehicle is assigned to "
    "an officer or unit, the system logs the assignment with date, time, and purpose, creating a "
    "complete chain of accountability. The maintenance scheduling feature automatically alerts "
    "the logistics officer when a vehicle is due for service based on mileage or time intervals, "
    "preventing costly breakdowns and ensuring that vehicles are always roadworthy."
))
story.append(body(
    "Fuel consumption tracking allows the department to monitor fuel usage per vehicle, identify "
    "anomalies that may indicate waste or unauthorized use, and budget more accurately for fuel "
    "expenses. The equipment inventory module extends the same tracking capability to all other "
    "department assets, from communication equipment to office supplies. Items can be checked "
    "out to specific officers, and the system maintains a complete custody history. A status "
    "dashboard provides an at-a-glance summary of all assets, highlighting items that are due "
    "for maintenance, currently unassigned, or flagged as needing replacement."
))

vehicle_features = [
    ["Feature", "Description"],
    ["Vehicle Registry", "Complete vehicle profiles with registration, insurance, and assignment history"],
    ["Assignment Tracking", "Log vehicle/equipment assignments to officers with date, time, and purpose"],
    ["Maintenance Scheduling", "Automated service reminders based on mileage or time intervals"],
    ["Fuel Log", "Track fuel consumption per vehicle, identify anomalies, and support budgeting"],
    ["Equipment Inventory", "Register and track all department assets with checkout and custody history"],
    ["Status Dashboard", "Overview of all assets highlighting maintenance due, unassigned, or replacement needs"],
]
story.append(KeepTogether([spacer(6), heading3("Vehicle and Equipment Module Feature Summary"), make_table(vehicle_features, col_w2)]))
story.append(PageBreak())

# --- 8. Implementation Plan ---
story.append(heading1("8. Implementation Plan"))
story.append(accent_line())
story.append(body(
    "The implementation follows a phased approach designed to deliver value early, minimize "
    "disruption to daily operations, and allow for iterative feedback. Each phase includes "
    "dedicated time for development, testing, user training, and feedback incorporation. "
    "The total project duration is approximately 11 weeks from the signing of the agreement "
    "to full system handover, assuming timely feedback and cooperation from the department."
))

timeline_data = [
    ["Phase", "Module", "Duration", "Key Deliverables"],
    ["Phase 1", "FIR and Case Management", "4 weeks", "Working FIR system, data migration support, user training"],
    ["Phase 2", "Staff/Duty and Reporting", "3 weeks", "Attendance system, duty rosters, report templates, dashboards"],
    ["Phase 3", "Vehicle and Equipment", "2 weeks", "Fleet registry, maintenance scheduler, equipment inventory"],
    ["Phase 4", "Testing and Training", "2 weeks", "End-to-end testing, staff training sessions, user manuals, go-live"],
]
timeline_col_w = [CONTENT_W * 0.12, CONTENT_W * 0.25, CONTENT_W * 0.13, CONTENT_W * 0.50]
story.append(KeepTogether([spacer(6), heading3("Project Timeline"), make_table(timeline_data, timeline_col_w)]))
story.append(spacer(12))
story.append(body(
    "Each phase begins with a detailed requirements confirmation meeting to ensure alignment "
    "between the development team and department stakeholders. At the end of each phase, a "
    "review session is conducted to demonstrate the completed functionality, gather feedback, "
    "and make any necessary adjustments before proceeding to the next phase. This iterative "
    "approach ensures that the final system accurately reflects the department's actual needs "
    "and workflows, rather than imposing a one-size-fits-all solution."
))
story.append(body(
    "Data migration from existing paper records to the new digital system will be supported "
    "during Phase 1, with the development team providing data entry templates and guidance. "
    "Historical data that the department wishes to digitize can be entered gradually, with "
    "the option to prioritize recent records and backfill older data over time. Training "
    "sessions will be conducted for all user groups, with comprehensive user manuals and "
    "quick-reference guides provided in both digital and printed formats."
))

# --- 9. Technology Stack ---
story.append(heading1("9. Technology Stack"))
story.append(accent_line())
story.append(body(
    "The system is built using proven, industry-standard technologies that prioritize "
    "reliability, security, and long-term maintainability. The entire application is web-based, "
    "meaning it runs in any modern web browser (Chrome, Firefox, Edge, Safari) without "
    "requiring any software installation on client devices. This approach dramatically "
    "reduces deployment complexity and allows officers to access the system from any "
    "computer or tablet within the department's network."
))

tech_data = [
    ["Component", "Technology", "Purpose"],
    ["Frontend", "HTML5, CSS3, JavaScript", "Responsive, user-friendly web interface accessible from any browser"],
    ["Backend", "Python (Django/Flask)", "Robust server-side logic, security, and API development"],
    ["Database", "MySQL / PostgreSQL", "Reliable, ACID-compliant data storage with backup support"],
    ["Server", "Local Linux Server", "All data stays within the department's physical premises"],
    ["Security", "SSL, Encryption, RBAC", "Data encrypted at rest and in transit; role-based access control"],
    ["Responsive Design", "CSS Framework", "Works on desktops, tablets, and mobile devices seamlessly"],
]
tech_col_w = [CONTENT_W * 0.18, CONTENT_W * 0.27, CONTENT_W * 0.55]
story.append(KeepTogether([spacer(6), make_table(tech_data, tech_col_w)]))
story.append(spacer(8))
story.append(body(
    "The choice of a local server deployment (as opposed to cloud hosting) is a deliberate "
    "decision driven by the sensitive nature of law enforcement data. All data remains "
    "physically within the department's control, accessible only through the department's "
    "internal network. The system includes automated daily database backups with configurable "
    "retention periods, ensuring that data can be recovered in the event of hardware failure "
    "or accidental deletion."
))
story.append(PageBreak())

# --- 10. Investment & Payment Terms ---
story.append(heading1("10. Investment and Payment Terms"))
story.append(accent_line())
story.append(body(
    "We understand that budget allocation for government departments follows specific "
    "procedures and timelines. Our pricing structure is designed to be transparent, "
    "competitive, and aligned with the phased delivery approach. The total investment covers "
    "all four modules, including development, deployment, training, and 12 months of "
    "post-launch technical support. There are no hidden fees or recurring licensing costs "
    "for the core system."
))

pricing_data = [
    ["Module", "Scope", "Investment"],
    ["Module 1: FIR and Case Management", "Full FIR lifecycle, case tracking, evidence management, search, dashboards", "Negotiable"],
    ["Module 2: Staff and Duty Management", "Attendance, duty rosters, leave management, shift scheduling, overtime", "Negotiable"],
    ["Module 3: Automated Reporting", "Pre-built reports, dashboards, visual analytics, export functionality", "Negotiable"],
    ["Module 4: Vehicle and Equipment", "Fleet registry, assignment tracking, maintenance, fuel log, inventory", "Negotiable"],
    ["Training and Support", "Staff training, user manuals, 12-month post-launch support", "Included"],
]
pricing_col_w = [CONTENT_W * 0.30, CONTENT_W * 0.48, CONTENT_W * 0.22]
story.append(KeepTogether([spacer(6), make_table(pricing_data, pricing_col_w)]))
story.append(spacer(12))

story.append(heading2("Proposed Payment Schedule"))
story.append(body(
    "Payments are structured to align with project milestones, reducing financial risk for "
    "the department and ensuring accountability for the development team. The proposed "
    "payment structure is as follows: thirty percent (30%) of the total project value is "
    "payable upon signing of the formal agreement, forty percent (40%) is payable upon "
    "successful delivery and acceptance testing of all four modules, and the remaining thirty "
    "percent (30%) is payable after one month of system usage, once any post-launch "
    "adjustments have been addressed. This structure ensures that the department only "
    "pays for results that have been delivered and verified."
))

# --- 11. Why Choose Us ---
story.append(heading1("11. Why Choose Us"))
story.append(accent_line())
story.append(body(
    "We bring a unique combination of technical expertise and local context understanding "
    "that makes us the ideal partner for this digital transformation initiative. As a local "
    "software development team, we understand the specific challenges faced by government "
    "departments in our city, including budget constraints, infrastructure limitations, and "
    "the need for systems that work reliably in environments with intermittent connectivity. "
    "Our solutions are not generic imports from other contexts; they are purpose-built for "
    "the realities of local law enforcement operations."
))
story.append(body(
    "Our commitment extends well beyond the initial delivery. We include comprehensive staff "
    "training to ensure that every user is comfortable and proficient with the system, and we "
    "provide twelve months of post-launch technical support at no additional cost. This means "
    "that any bugs, issues, or minor enhancement requests that arise during the first year of "
    "operation will be addressed promptly and professionally. We also design all our systems "
    "with scalability in mind, so as the department grows or its needs change, the system "
    "can be extended and enhanced without requiring a complete rebuild."
))
story.append(body(
    "Data security is at the core of everything we build. We implement industry-standard "
    "encryption, role-based access controls, and comprehensive audit logging to ensure that "
    "sensitive law enforcement data is protected against unauthorized access, accidental "
    "loss, or system failures. Our local presence means that support is always just a phone "
    "call away, and we can respond to critical issues on-site within hours rather than days."
))

# --- 12. Next Steps ---
story.append(heading1("12. Next Steps"))
story.append(accent_line())
story.append(body(
    "We are eager to begin this partnership and help the department achieve its digital "
    "transformation goals. The following steps outline the immediate actions required to "
    "formalize the engagement and initiate the project. We recommend moving quickly to "
    "maintain momentum and begin delivering results as soon as possible."
))

steps_data = [
    ["Step", "Action", "Timeline", "Responsible"],
    ["1", "Review and sign the formal project agreement", "Week 1", "Department Leadership"],
    ["2", "Conduct kick-off meeting and finalize requirements", "Week 1-2", "Both Parties"],
    ["3", "Provide existing data samples and format requirements", "Week 2", "Department Staff"],
    ["4", "Development of Module 1 (FIR and Case Management) begins", "Week 2", "Development Team"],
    ["5", "First progress review and demo", "Week 4", "Both Parties"],
]
steps_col_w = [CONTENT_W * 0.08, CONTENT_W * 0.50, CONTENT_W * 0.14, CONTENT_W * 0.28]
story.append(KeepTogether([spacer(6), make_table(steps_data, steps_col_w)]))
story.append(spacer(16))
story.append(body(
    "We are available at your earliest convenience to discuss this proposal in detail, "
    "answer any questions, and begin the formal engagement process. Our team is committed "
    "to delivering a system that will meaningfully improve the department's efficiency, "
    "accountability, and service to the community. We look forward to your favorable response."
))

# --- Page footer ---
def add_page_number(canvas, doc):
    page_num = canvas.getPageNumber()
    if page_num > 1:
        canvas.saveState()
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, MARGIN - 15, PAGE_W - MARGIN, MARGIN - 15)
        canvas.setFont('Inter', 8)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawCentredString(PAGE_W / 2, MARGIN - 28, f"Page {page_num - 1}")
        canvas.restoreState()

# --- Build ---
doc = SimpleDocTemplate(
    BODY_PDF, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title="Police Department Digital Transformation Proposal",
    author="Z.ai",
    subject="Proposal for Police Department Automation System",
)
doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(f"Body PDF generated: {BODY_PDF}")
