'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Shield, FileText, Users, BarChart3, Car, Wrench, Search, Plus, Eye, Edit, Trash2,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, Activity, TrendingUp,
  LayoutDashboard, Menu, X, UserCheck, CalendarDays, Fuel, ClipboardList,
  ChevronRight, MapPin, Phone, Mail, BadgeCheck, CarFront, ShieldAlert, CircleDot
} from 'lucide-react'

// ========== TYPES ==========
type Module = 'dashboard' | 'cases' | 'personnel' | 'duty' | 'leave' | 'vehicles' | 'equipment' | 'reports'

interface DashboardData {
  totalFIRs: number; openFIRs: number; underInvestigationFIRs: number; closedFIRs: number
  totalOfficers: number; activeOfficers: number; onLeaveOfficers: number
  totalVehicles: number; availableVehicles: number; assignedVehicles: number; maintenanceVehicles: number
  totalEquipmentItems: number; equipmentNeedsAttention: number
  recentFIRs: FIR[]
  crimeByCategory: { category: string; count: number }[]
  firByPriority: { priority: string; count: number }[]
}

interface FIR {
  id: string; firNumber: string; complainantName: string; complainantPhone?: string
  complainantAddress?: string; incidentDate: string; incidentLocation: string
  crimeCategory: string; description: string; accusedNames?: string
  status: string; assignedTo?: string; priority: string; station: string
  createdAt: string; updatedAt: string; investigationNotes: InvestigationNote[]
}

interface InvestigationNote {
  id: string; firId: string; officerName: string; note: string
  actionTaken?: string; createdAt: string
}

interface Officer {
  id: string; badgeNumber: string; name: string; rank: string; department: string
  phone?: string; email?: string; status: string; createdAt: string; updatedAt: string
  attendances?: Attendance[]; leaveRequests?: LeaveRequest[]; dutyAssignments?: DutyAssignment[]
}

interface Attendance {
  id: string; officerId: string; date: string; checkIn?: string; checkOut?: string
  hoursWorked?: number; status: string; notes?: string; createdAt: string; officer?: Officer
}

interface DutyAssignment {
  id: string; officerId: string; shiftType: string; postArea?: string
  assignedDate: string; startTime?: string; endTime?: string; createdBy?: string
  createdAt: string; officer?: Officer
}

interface LeaveRequest {
  id: string; officerId: string; leaveType: string; startDate: string; endDate: string
  days?: number; reason?: string; status: string; approvedBy?: string
  createdAt: string; updatedAt: string; officer?: Officer
}

interface Vehicle {
  id: string; registrationNumber: string; make: string; model: string; year?: number
  vehicleType: string; status: string; insuranceExpiry?: string
  lastServiceDate?: string; nextServiceDate?: string; currentMileage: number
  notes?: string; createdAt: string; updatedAt: string
  assignments?: VehicleAssignment[]; fuelLogs?: FuelLog[]; maintenanceLogs?: MaintenanceLog[]
}

interface VehicleAssignment {
  id: string; vehicleId: string; officerName?: string; officerBadge?: string
  purpose?: string; assignedDate: string; returnDate?: string; status: string; createdAt: string
}

interface FuelLog {
  id: string; vehicleId: string; date: string; fuelType: string; liters: number
  cost?: number; mileage?: number; filledBy?: string; createdAt: string
}

interface MaintenanceLog {
  id: string; vehicleId: string; maintenanceType: string; description: string
  cost?: number; performedBy?: string; performedDate: string
  nextDueDate?: string; status: string; createdAt: string
}

interface Equipment {
  id: string; itemCode: string; name: string; category: string; quantity: number
  availableQty: number; condition: string; storageLocation?: string
  lastChecked?: string; createdAt: string; updatedAt: string
}

// ========== AUTH HELPERS ==========
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'System Administrator', STATION_COMMANDER: 'Station Commander',
  INVESTIGATOR: 'Investigator', CLERK: 'Clerk',
}
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800', STATION_COMMANDER: 'bg-purple-100 text-purple-800',
  INVESTIGATOR: 'bg-blue-100 text-blue-800', CLERK: 'bg-slate-100 text-slate-700',
}
// Module access by minimum role level
const ROLE_LEVEL: Record<string, number> = { CLERK: 1, INVESTIGATOR: 2, STATION_COMMANDER: 3, ADMIN: 4 }
const MODULE_ACCESS: Record<string, number> = {
  dashboard: 1, cases: 1, personnel: 2, duty: 2, leave: 1, vehicles: 1, equipment: 2, reports: 2,
}

// ========== HELPERS ==========
const fmt = (d?: string) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return d }
}
const fmtDT = (d?: string) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d }
}
const fmtTime = (d?: string) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) } catch { return d }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Open': 'bg-amber-100 text-amber-800', 'Under Investigation': 'bg-violet-100 text-violet-800',
    'Closed': 'bg-emerald-100 text-emerald-800', 'Transferred': 'bg-slate-100 text-slate-800',
    'Active': 'bg-emerald-100 text-emerald-800', 'On Leave': 'bg-amber-100 text-amber-800', 'Suspended': 'bg-red-100 text-red-800',
    'Available': 'bg-emerald-100 text-emerald-800', 'Assigned': 'bg-violet-100 text-violet-800',
    'Maintenance': 'bg-amber-100 text-amber-800', 'Out of Service': 'bg-red-100 text-red-800',
    'Pending': 'bg-amber-100 text-amber-800', 'Approved': 'bg-emerald-100 text-emerald-800', 'Rejected': 'bg-red-100 text-red-800',
    'Present': 'bg-emerald-100 text-emerald-800', 'Absent': 'bg-red-100 text-red-800', 'Half Day': 'bg-amber-100 text-amber-800',
    'Returned': 'bg-slate-100 text-slate-600',
    'Good': 'bg-emerald-100 text-emerald-800', 'Fair': 'bg-amber-100 text-amber-800',
    'Poor': 'bg-red-100 text-red-800', 'Needs Replacement': 'bg-red-200 text-red-900',
    'Scheduled': 'bg-violet-100 text-violet-800', 'In Progress': 'bg-amber-100 text-amber-800', 'Completed': 'bg-emerald-100 text-emerald-800',
  }
  return <Badge variant="outline" className={`${map[status] || 'bg-slate-100 text-slate-700'} border-0 font-medium`}>{status}</Badge>
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-800', 'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-amber-100 text-amber-800', 'Low': 'bg-emerald-100 text-emerald-800',
  }
  return <Badge variant="outline" className={`${map[priority] || ''} border-0 font-medium`}>{priority}</Badge>
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonRow() {
  return <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No data available</td></tr>
}

// ========== MAIN COMPONENT ==========
export default function Home() {
  const { data: session, status } = useSession()
  const [activeModule, setActiveModule] = useState<Module>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const userRole = (session?.user as any)?.role || 'CLERK'
  const userName = session?.user?.name || 'Unknown'
  const userUsername = (session?.user as any)?.username || ''
  const userLevel = ROLE_LEVEL[userRole] || 1

  const allNavItems: { id: Module; label: string; icon: React.ElementType; minLevel: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, minLevel: 1 },
    { id: 'cases', label: 'Case Management', icon: FileText, minLevel: 1 },
    { id: 'personnel', label: 'Personnel', icon: Users, minLevel: 2 },
    { id: 'duty', label: 'Duty & Attendance', icon: CalendarDays, minLevel: 2 },
    { id: 'leave', label: 'Leave Requests', icon: ClipboardList, minLevel: 1 },
    { id: 'vehicles', label: 'Vehicle Fleet', icon: Car, minLevel: 1 },
    { id: 'equipment', label: 'Equipment', icon: Wrench, minLevel: 2 },
    { id: 'reports', label: 'Reports', icon: BarChart3, minLevel: 2 },
  ]
  const navItems = allNavItems.filter(n => n.minLevel <= userLevel)

  // If session loading, show minimal loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center mx-auto">
            <Shield className="h-6 w-6 text-white animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to login
  if (!session) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  // Ensure active module is accessible
  if (MODULE_ACCESS[activeModule] > userLevel) {
    setActiveModule('dashboard')
  }

  const initials = userName.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <DashboardModule onNavigate={setActiveModule} />
      case 'cases': return <CasesModule />
      case 'personnel': return <PersonnelModule />
      case 'duty': return <DutyModule />
      case 'leave': return <LeaveModule />
      case 'vehicles': return <VehiclesModule />
      case 'equipment': return <EquipmentModule />
      case 'reports': return <ReportsModule />
      default: return <DashboardModule onNavigate={setActiveModule} />
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-violet-700 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-violet-600">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">Police Dept.</h1>
                <p className="text-violet-200 text-xs">Automation System</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-violet-600 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveModule(item.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeModule === item.id
                    ? 'bg-violet-600 text-white border-r-3 border-white'
                    : 'text-violet-100 hover:bg-violet-600/50 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-violet-600">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-violet-500 flex items-center justify-center text-sm font-bold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-violet-200">{ROLE_LABELS[userRole] || userRole}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-1.5 hover:bg-violet-500 rounded-lg transition-colors"
                title="Sign out"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {(() => {
              const current = navItems.find(n => n.id === activeModule)
              return current ? <>
                <current.icon className="h-5 w-5 text-violet-600" />
                <h2 className="font-semibold text-lg">{current.label}</h2>
              </> : null
            })()}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`hidden sm:inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[userRole] || ''}`}>
              {ROLE_LABELS[userRole] || userRole}
            </span>
            <span className="text-sm text-muted-foreground hidden md:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  )
}

// ========== DASHBOARD MODULE ==========
function DashboardModule({ onNavigate }: { onNavigate: (m: Module) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><Card key={i}><CardContent className="p-4 h-24 bg-slate-100 animate-pulse rounded-lg"/></Card>)}</div></div>
  if (!data) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load dashboard data.</AlertDescription></Alert>

  const maxCrimeCount = Math.max(...(data.crimeByCategory.map(c => c.count) || [1]), 1)

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total FIRs" value={data.totalFIRs} sub={`${data.openFIRs} open, ${data.closedFIRs} closed`} color="bg-violet-600" />
        <StatCard icon={Users} label="Officers" value={data.totalOfficers} sub={`${data.activeOfficers} active, ${data.onLeaveOfficers} on leave`} color="bg-emerald-600" />
        <StatCard icon={Car} label="Vehicles" value={data.totalVehicles} sub={`${data.availableVehicles} available, ${data.assignedVehicles} assigned`} color="bg-amber-500" />
        <StatCard icon={Wrench} label="Equipment" value={data.totalEquipmentItems} sub={`${data.equipmentNeedsAttention} need attention`} color="bg-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent FIRs */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent FIRs</CardTitle>
                <CardDescription>Latest filed incident reports</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('cases')} className="text-violet-600 border-violet-200 hover:bg-violet-50">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader><TableRow><TableHead>FIR #</TableHead><TableHead>Complainant</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.recentFIRs.length === 0 ? <SkeletonRow /> : data.recentFIRs.map(fir => (
                    <TableRow key={fir.id} className="cursor-pointer hover:bg-violet-50/50">
                      <TableCell className="font-mono text-sm font-medium">{fir.firNumber}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{fir.complainantName}</TableCell>
                      <TableCell><Badge variant="outline" className="border-slate-200">{fir.crimeCategory}</Badge></TableCell>
                      <TableCell><PriorityBadge priority={fir.priority} /></TableCell>
                      <TableCell><StatusBadge status={fir.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Crime Analytics */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Crime by Category</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data.crimeByCategory || []).length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : data.crimeByCategory.map(c => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-sm"><span>{c.category}</span><span className="font-semibold">{c.count}</span></div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${(c.count / maxCrimeCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">FIR by Priority</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data.firByPriority || []).length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : data.firByPriority.map(p => (
                <div key={p.priority} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <PriorityBadge priority={p.priority} />
                  <span className="font-bold text-lg">{p.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-violet-50 hover:border-violet-200" onClick={() => onNavigate('cases')}>
              <Plus className="h-5 w-5 text-violet-600" /><span className="text-sm">New FIR</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-violet-50 hover:border-violet-200" onClick={() => onNavigate('personnel')}>
              <UserCheck className="h-5 w-5 text-emerald-600" /><span className="text-sm">Add Officer</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-violet-50 hover:border-violet-200" onClick={() => onNavigate('vehicles')}>
              <CarFront className="h-5 w-5 text-amber-600" /><span className="text-sm">Assign Vehicle</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-violet-50 hover:border-violet-200" onClick={() => onNavigate('leave')}>
              <CheckCircle className="h-5 w-5 text-violet-600" /><span className="text-sm">Approve Leave</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ========== CASES MODULE ==========
function CasesModule() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || 'CLERK'
  const userName = session?.user?.name || ''
  const canEdit = userRole !== 'CLERK' // Clerks can register but not edit cases
  const canDelete = userRole === 'ADMIN'
  const [firs, setFirs] = useState<FIR[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [viewFIR, setViewFIR] = useState<FIR | null>(null)
  const [editFIR, setEditFIR] = useState<FIR | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteOfficer, setNoteOfficer] = useState('')
  const [noteAction, setNoteAction] = useState('')
  const [showNoteDialog, setShowNoteDialog] = useState(false)

  // Create form
  const [form, setForm] = useState({ firNumber: '', complainantName: '', complainantPhone: '', complainantAddress: '', incidentDate: '', incidentLocation: '', crimeCategory: '', description: '', accusedNames: '', status: 'Open', assignedTo: '', priority: 'Medium', station: 'Main Station' })

  const loadFIRs = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (filterPriority) params.set('priority', filterPriority)
    fetch(`/api/firs?${params}`).then(r => r.json()).then(d => { setFirs(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (filterPriority) params.set('priority', filterPriority)
    fetch(`/api/firs?${params}`).then(r => r.json()).then(d => { setFirs(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [search, filterStatus, filterCategory, filterPriority])

  const handleCreate = async () => {
    const res = await fetch('/api/firs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowCreate(false); resetForm(); loadFIRs() }
  }

  const handleUpdate = async () => {
    if (!editFIR) return
    const res = await fetch(`/api/firs/${editFIR.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editFIR) })
    if (res.ok) { setEditFIR(null); loadFIRs(); if (viewFIR?.id === editFIR.id) { const d = await res.json(); setViewFIR({ ...viewFIR, ...d.data }); } }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FIR?')) return
    await fetch(`/api/firs/${id}`, { method: 'DELETE' })
    setViewFIR(null); loadFIRs()
  }

  const handleAddNote = async () => {
    if (!viewFIR || !noteText) return
    const res = await fetch(`/api/firs/${viewFIR.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: noteText, actionTaken: noteAction || undefined }) })
    if (res.ok) {
      const d = await res.json()
      setViewFIR({ ...viewFIR, investigationNotes: [d.data, ...viewFIR.investigationNotes] })
      setNoteText(''); setNoteAction(''); setShowNoteDialog(false)
    }
  }

  const resetForm = () => setForm({ firNumber: '', complainantName: '', complainantPhone: '', complainantAddress: '', incidentDate: '', incidentLocation: '', crimeCategory: '', description: '', accusedNames: '', status: 'Open', assignedTo: '', priority: 'Medium', station: 'Main Station' })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search FIRs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Open">Open</SelectItem><SelectItem value="Under Investigation">Under Investigation</SelectItem><SelectItem value="Closed">Closed</SelectItem><SelectItem value="Transferred">Transferred</SelectItem></SelectContent></Select>
            <Select value={filterCategory} onValueChange={v => setFilterCategory(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="Theft">Theft</SelectItem><SelectItem value="Assault">Assault</SelectItem><SelectItem value="Robbery">Robbery</SelectItem><SelectItem value="Fraud">Fraud</SelectItem><SelectItem value="Vehicle Theft">Vehicle Theft</SelectItem><SelectItem value="Vandalism">Vandalism</SelectItem><SelectItem value="Domestic Violence">Domestic Violence</SelectItem></SelectContent></Select>
            <Select value={filterPriority} onValueChange={v => setFilterPriority(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Critical">Critical</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent></Select>
            <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> New FIR</Button></DialogTrigger><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Register New FIR</DialogTitle><DialogDescription>Fill in the details to register a new First Information Report.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>FIR Number *</Label><Input value={form.firNumber} onChange={e => setForm({...form, firNumber: e.target.value})} placeholder="FIR-2026-XXX" /></div><div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent></Select></div></div><div><Label>Complainant Name *</Label><Input value={form.complainantName} onChange={e => setForm({...form, complainantName: e.target.value})} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Phone</Label><Input value={form.complainantPhone} onChange={e => setForm({...form, complainantPhone: e.target.value})} /></div><div><Label>Address</Label><Input value={form.complainantAddress} onChange={e => setForm({...form, complainantAddress: e.target.value})} /></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Incident Date *</Label><Input type="date" value={form.incidentDate} onChange={e => setForm({...form, incidentDate: e.target.value})} /></div><div><Label>Incident Location *</Label><Input value={form.incidentLocation} onChange={e => setForm({...form, incidentLocation: e.target.value})} /></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Crime Category *</Label><Select value={form.crimeCategory} onValueChange={v => setForm({...form, crimeCategory: v})}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent><SelectItem value="Theft">Theft</SelectItem><SelectItem value="Assault">Assault</SelectItem><SelectItem value="Robbery">Robbery</SelectItem><SelectItem value="Fraud">Fraud</SelectItem><SelectItem value="Vehicle Theft">Vehicle Theft</SelectItem><SelectItem value="Vandalism">Vandalism</SelectItem><SelectItem value="Domestic Violence">Domestic Violence</SelectItem></SelectContent></Select></div><div><Label>Station</Label><Input value={form.station} onChange={e => setForm({...form, station: e.target.value})} /></div></div><div><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Accused Names</Label><Input value={form.accusedNames} onChange={e => setForm({...form, accusedNames: e.target.value})} /></div><div><Label>Assigned To</Label><Input value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCreate}>Register FIR</Button></DialogFooter></DialogContent></Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>FIR #</TableHead><TableHead>Complainant</TableHead><TableHead className="hidden md:table-cell">Location</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
                firs.length === 0 ? <SkeletonRow /> :
                firs.map(fir => (
                  <TableRow key={fir.id}>
                    <TableCell className="font-mono text-sm font-medium text-violet-700">{fir.firNumber}</TableCell>
                    <TableCell className="max-w-[120px] truncate font-medium">{fir.complainantName}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[150px] truncate text-muted-foreground">{fir.incidentLocation}</TableCell>
                    <TableCell><Badge variant="outline" className="border-slate-200">{fir.crimeCategory}</Badge></TableCell>
                    <TableCell><PriorityBadge priority={fir.priority} /></TableCell>
                    <TableCell><StatusBadge status={fir.status} /></TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{fmt(fir.incidentDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewFIR(fir)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditFIR(fir)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(fir.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View FIR Dialog */}
      <Dialog open={!!viewFIR} onOpenChange={() => setViewFIR(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewFIR && <>
            <DialogHeader>
              <div className="flex items-center gap-3"><DialogTitle className="font-mono">{viewFIR.firNumber}</DialogTitle><PriorityBadge priority={viewFIR.priority} /><StatusBadge status={viewFIR.status} /></div>
              <DialogDescription>Filed on {fmtDT(viewFIR.createdAt)} at {viewFIR.station}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground mb-1">Complainant</p><p className="font-medium">{viewFIR.complainantName}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Phone</p><p className="font-medium">{viewFIR.complainantPhone || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Address</p><p className="font-medium">{viewFIR.complainantAddress || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Assigned To</p><p className="font-medium">{viewFIR.assignedTo || 'Unassigned'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Incident Date</p><p className="font-medium">{fmtDT(viewFIR.incidentDate)}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Location</p><p className="font-medium">{viewFIR.incidentLocation}</p></div>
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground mb-1">Crime Category</p><Badge variant="outline" className="border-violet-200 text-violet-700">{viewFIR.crimeCategory}</Badge></div>
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm bg-slate-50 p-3 rounded-lg">{viewFIR.description}</p></div>
                {viewFIR.accusedNames && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground mb-1">Accused</p><p className="text-sm bg-red-50 p-3 rounded-lg text-red-800 font-medium">{viewFIR.accusedNames}</p></div>}
              </div>
              <div className="flex gap-2 mt-2">
                {canEdit && <Button variant="outline" size="sm" onClick={() => { setEditFIR(viewFIR); setViewFIR(null) }}><Edit className="h-4 w-4 mr-1" />Edit</Button>}
                {canDelete && <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(viewFIR.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>}
                {canEdit && <Button size="sm" className="bg-violet-600 hover:bg-violet-700 ml-auto" onClick={() => setShowNoteDialog(true)}><Plus className="h-4 w-4 mr-1" />Add Note</Button>}
              </div>
              {/* Investigation Notes */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-violet-600" />Investigation Notes ({viewFIR.investigationNotes?.length || 0})</h4>
                {(!viewFIR.investigationNotes || viewFIR.investigationNotes.length === 0) ? (
                  <p className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-lg text-center">No investigation notes yet.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {viewFIR.investigationNotes.map(n => (
                      <div key={n.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{n.officerName}</span>
                          <span className="text-xs text-muted-foreground">{fmtDT(n.createdAt)}</span>
                        </div>
                        <p className="text-sm">{n.note}</p>
                        {n.actionTaken && <p className="text-xs text-violet-700 mt-1 bg-violet-50 px-2 py-1 rounded inline-block">Action: {n.actionTaken}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Investigation Note</DialogTitle><DialogDescription>Record your investigation findings and actions. Notes are immutable once added.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="text-sm text-muted-foreground">Recording as: <span className="font-medium text-foreground">{userName}</span></div>
          <div><Label>Note *</Label><Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Investigation findings..." /></div>
          <div><Label>Action Taken</Label><Textarea value={noteAction} onChange={e => setNoteAction(e.target.value)} rows={2} placeholder="Actions taken based on findings..." /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleAddNote}>Add Note</Button></DialogFooter>
      </DialogContent>
      </Dialog>

      {/* Edit FIR Dialog */}
      <Dialog open={!!editFIR} onOpenChange={() => setEditFIR(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit FIR - {editFIR?.firNumber}</DialogTitle></DialogHeader>
          {editFIR && <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Status</Label><Select value={editFIR.status} onValueChange={v => setEditFIR({...editFIR, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="Under Investigation">Under Investigation</SelectItem><SelectItem value="Closed">Closed</SelectItem><SelectItem value="Transferred">Transferred</SelectItem></SelectContent></Select></div>
              <div><Label>Priority</Label><Select value={editFIR.priority} onValueChange={v => setEditFIR({...editFIR, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Complainant Name</Label><Input value={editFIR.complainantName} onChange={e => setEditFIR({...editFIR, complainantName: e.target.value})} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Phone</Label><Input value={editFIR.complainantPhone || ''} onChange={e => setEditFIR({...editFIR, complainantPhone: e.target.value})} /></div><div><Label>Address</Label><Input value={editFIR.complainantAddress || ''} onChange={e => setEditFIR({...editFIR, complainantAddress: e.target.value})} /></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Incident Date</Label><Input type="date" value={editFIR.incidentDate ? editFIR.incidentDate.split('T')[0] : ''} onChange={e => setEditFIR({...editFIR, incidentDate: e.target.value})} /></div><div><Label>Location</Label><Input value={editFIR.incidentLocation} onChange={e => setEditFIR({...editFIR, incidentLocation: e.target.value})} /></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Crime Category</Label><Select value={editFIR.crimeCategory} onValueChange={v => setEditFIR({...editFIR, crimeCategory: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Theft">Theft</SelectItem><SelectItem value="Assault">Assault</SelectItem><SelectItem value="Robbery">Robbery</SelectItem><SelectItem value="Fraud">Fraud</SelectItem><SelectItem value="Vehicle Theft">Vehicle Theft</SelectItem><SelectItem value="Vandalism">Vandalism</SelectItem><SelectItem value="Domestic Violence">Domestic Violence</SelectItem></SelectContent></Select></div><div><Label>Assigned To</Label><Input value={editFIR.assignedTo || ''} onChange={e => setEditFIR({...editFIR, assignedTo: e.target.value})} /></div></div>
            <div><Label>Description</Label><Textarea value={editFIR.description} onChange={e => setEditFIR({...editFIR, description: e.target.value})} rows={3} /></div>
            <div><Label>Accused Names</Label><Input value={editFIR.accusedNames || ''} onChange={e => setEditFIR({...editFIR, accusedNames: e.target.value})} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditFIR(null)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleUpdate}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== PERSONNEL MODULE ==========
function PersonnelModule() {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewOfficer, setViewOfficer] = useState<Officer | null>(null)
  const [editOfficer, setEditOfficer] = useState<Officer | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ badgeNumber: '', name: '', rank: 'Officer', department: 'General Patrol', phone: '', email: '', status: 'Active' })

  const loadOfficers = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterDept) params.set('department', filterDept)
    if (filterStatus) params.set('status', filterStatus)
    fetch(`/api/officers?${params}`).then(r => r.json()).then(d => { setOfficers(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterDept) params.set('department', filterDept)
    if (filterStatus) params.set('status', filterStatus)
    fetch(`/api/officers?${params}`).then(r => r.json()).then(d => { setOfficers(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [search, filterDept, filterStatus])

  const handleCreate = async () => {
    const res = await fetch('/api/officers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowCreate(false); setForm({ badgeNumber: '', name: '', rank: 'Officer', department: 'General Patrol', phone: '', email: '', status: 'Active' }); loadOfficers() }
  }

  const handleUpdate = async () => {
    if (!editOfficer) return
    await fetch(`/api/officers/${editOfficer.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editOfficer) })
    setEditOfficer(null); loadOfficers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this officer?')) return
    await fetch(`/api/officers/${id}`, { method: 'DELETE' })
    setViewOfficer(null); loadOfficers()
  }

  const handleViewOfficer = async (id: string) => {
    const res = await fetch(`/api/officers/${id}`)
    if (res.ok) { const d = await res.json(); setViewOfficer(d) }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search officers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={filterDept} onValueChange={v => setFilterDept(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem><SelectItem value="General Patrol">General Patrol</SelectItem><SelectItem value="Investigations">Investigations</SelectItem><SelectItem value="Traffic">Traffic</SelectItem><SelectItem value="Administration">Administration</SelectItem></SelectContent></Select>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent></Select>
            <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> Add Officer</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add New Officer</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div><Label>Badge Number *</Label><Input value={form.badgeNumber} onChange={e => setForm({...form, badgeNumber: e.target.value})} placeholder="P-XXXX" /></div><div><Label>Rank</Label><Select value={form.rank} onValueChange={v => setForm({...form, rank: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Constable">Constable</SelectItem><SelectItem value="Sergeant">Sergeant</SelectItem><SelectItem value="Inspector">Inspector</SelectItem><SelectItem value="Commissioner">Commissioner</SelectItem></SelectContent></Select></div></div><div><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Department</Label><Select value={form.department} onValueChange={v => setForm({...form, department: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="General Patrol">General Patrol</SelectItem><SelectItem value="Investigations">Investigations</SelectItem><SelectItem value="Traffic">Traffic</SelectItem><SelectItem value="Administration">Administration</SelectItem></SelectContent></Select></div><div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div></div><div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCreate}>Add Officer</Button></DialogFooter></DialogContent></Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Badge #</TableHead><TableHead>Name</TableHead><TableHead>Rank</TableHead><TableHead className="hidden md:table-cell">Department</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
                officers.length === 0 ? <SkeletonRow /> :
                officers.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm font-medium text-violet-700">{o.badgeNumber}</TableCell>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell><Badge variant="outline" className="border-slate-200">{o.rank}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{o.department}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{o.phone || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewOfficer(o.id)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOfficer(o)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(o.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Officer Dialog */}
      <Dialog open={!!viewOfficer} onOpenChange={() => setViewOfficer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewOfficer && <>
            <DialogHeader>
              <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg">{viewOfficer.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div><div><DialogTitle>{viewOfficer.name}</DialogTitle><DialogDescription>{viewOfficer.rank} • {viewOfficer.department} • {viewOfficer.badgeNumber}</DialogDescription></div><StatusBadge status={viewOfficer.status} /></div>
            </DialogHeader>
            <Tabs defaultValue="info" className="mt-2">
              <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="info">Info</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="leaves">Leaves</TabsTrigger><TabsTrigger value="duties">Duties</TabsTrigger></TabsList>
              <TabsContent value="info" className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{viewOfficer.phone || 'No phone'}</span></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{viewOfficer.email || 'No email'}</span></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => { setEditOfficer(viewOfficer); setViewOfficer(null) }}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(viewOfficer.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                </div>
              </TabsContent>
              <TabsContent value="attendance" className="mt-4">
                <div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{(!viewOfficer.attendances || viewOfficer.attendances.length === 0) ? <SkeletonRow /> : viewOfficer.attendances.slice(0, 14).map(a => (<TableRow key={a.id}><TableCell className="text-sm">{fmt(a.date)}</TableCell><TableCell className="text-sm">{fmtTime(a.checkIn)}</TableCell><TableCell className="text-sm">{fmtTime(a.checkOut)}</TableCell><TableCell className="text-sm">{a.hoursWorked || '—'}</TableCell><TableCell><StatusBadge status={a.status} /></TableCell></TableRow>))}</TableBody></Table></div>
              </TabsContent>
              <TabsContent value="leaves" className="mt-4">
                <div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{(!viewOfficer.leaveRequests || viewOfficer.leaveRequests.length === 0) ? <SkeletonRow /> : viewOfficer.leaveRequests.map(l => (<TableRow key={l.id}><TableCell className="text-sm">{l.leaveType}</TableCell><TableCell className="text-sm">{fmt(l.startDate)}</TableCell><TableCell className="text-sm">{fmt(l.endDate)}</TableCell><TableCell className="text-sm">{l.days || '—'}</TableCell><TableCell><StatusBadge status={l.status} /></TableCell></TableRow>))}</TableBody></Table></div>
              </TabsContent>
              <TabsContent value="duties" className="mt-4">
                <div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Shift</TableHead><TableHead>Post Area</TableHead><TableHead>Time</TableHead></TableRow></TableHeader><TableBody>{(!viewOfficer.dutyAssignments || viewOfficer.dutyAssignments.length === 0) ? <SkeletonRow /> : viewOfficer.dutyAssignments.slice(0, 14).map(d => (<TableRow key={d.id}><TableCell className="text-sm">{fmt(d.assignedDate)}</TableCell><TableCell><Badge variant="outline" className="border-slate-200">{d.shiftType}</Badge></TableCell><TableCell className="text-sm">{d.postArea || '—'}</TableCell><TableCell className="text-sm">{d.startTime} - {d.endTime}</TableCell></TableRow>))}</TableBody></Table></div>
              </TabsContent>
            </Tabs>
          </>}
        </DialogContent>
      </Dialog>

      {/* Edit Officer Dialog */}
      <Dialog open={!!editOfficer} onOpenChange={() => setEditOfficer(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Officer</DialogTitle></DialogHeader>
          {editOfficer && <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div><Label>Badge Number</Label><Input value={editOfficer.badgeNumber} onChange={e => setEditOfficer({...editOfficer, badgeNumber: e.target.value})} /></div><div><Label>Rank</Label><Select value={editOfficer.rank} onValueChange={v => setEditOfficer({...editOfficer, rank: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Constable">Constable</SelectItem><SelectItem value="Sergeant">Sergeant</SelectItem><SelectItem value="Inspector">Inspector</SelectItem><SelectItem value="Commissioner">Commissioner</SelectItem></SelectContent></Select></div></div>
            <div><Label>Name</Label><Input value={editOfficer.name} onChange={e => setEditOfficer({...editOfficer, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Department</Label><Select value={editOfficer.department} onValueChange={v => setEditOfficer({...editOfficer, department: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="General Patrol">General Patrol</SelectItem><SelectItem value="Investigations">Investigations</SelectItem><SelectItem value="Traffic">Traffic</SelectItem><SelectItem value="Administration">Administration</SelectItem></SelectContent></Select></div><div><Label>Status</Label><Select value={editOfficer.status} onValueChange={v => setEditOfficer({...editOfficer, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Phone</Label><Input value={editOfficer.phone || ''} onChange={e => setEditOfficer({...editOfficer, phone: e.target.value})} /></div><div><Label>Email</Label><Input value={editOfficer.email || ''} onChange={e => setEditOfficer({...editOfficer, email: e.target.value})} /></div></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditOfficer(null)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleUpdate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== DUTY & ATTENDANCE MODULE ==========
function DutyModule() {
  const [tab, setTab] = useState('duties')
  const [duties, setDuties] = useState<DutyAssignment[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ officerId: '', shiftType: 'Day', postArea: '', assignedDate: new Date().toISOString().split('T')[0], startTime: '06:00', endTime: '14:00' })

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/duty-assignments?date=${dateFilter}`).then(r => r.json()),
      fetch(`/api/attendance?date=${dateFilter}`).then(r => r.json()),
      fetch('/api/officers').then(r => r.json()),
    ]).then(([d, a, o]) => {
      setDuties(Array.isArray(d) ? d : [])
      setAttendance(Array.isArray(a) ? a : [])
      setOfficers(Array.isArray(o) ? o : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/duty-assignments?date=${dateFilter}`).then(r => r.json()),
      fetch(`/api/attendance?date=${dateFilter}`).then(r => r.json()),
      fetch('/api/officers').then(r => r.json()),
    ]).then(([d, a, o]) => {
      setDuties(Array.isArray(d) ? d : [])
      setAttendance(Array.isArray(a) ? a : [])
      setOfficers(Array.isArray(o) ? o : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [dateFilter])

  const handleAssign = async () => {
    if (!assignForm.officerId) return
    const res = await fetch('/api/duty-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignForm) })
    if (res.ok) { setShowAssign(false); setAssignForm({ officerId: '', shiftType: 'Day', postArea: '', assignedDate: new Date().toISOString().split('T')[0], startTime: '06:00', endTime: '14:00' }); loadData() }
  }

  const handleCheckIn = async (officerId: string) => {
    await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ officerId, date: dateFilter, status: 'Present' }) })
    loadData()
  }

  const handleCheckOut = async (officerId: string) => {
    await fetch('/api/attendance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ officerId, date: dateFilter }) })
    loadData()
  }

  const todayAttendance = (officerId: string) => attendance.find(a => a.officerId === officerId)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Label>Date</Label>
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" />
        </div>
        <Dialog open={showAssign} onOpenChange={setShowAssign}><DialogTrigger asChild><Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> Assign Duty</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Assign Duty</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div><Label>Officer *</Label><Select value={assignForm.officerId} onValueChange={v => setAssignForm({...assignForm, officerId: v})}><SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger><SelectContent>{officers.filter(o => o.status === 'Active').map(o => <SelectItem key={o.id} value={o.id}>{o.name} ({o.badgeNumber})</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div><Label>Shift</Label><Select value={assignForm.shiftType} onValueChange={v => setAssignForm({...assignForm, shiftType: v, startTime: v === 'Day' ? '06:00' : v === 'Night' ? '18:00' : '08:00', endTime: v === 'Day' ? '14:00' : v === 'Night' ? '06:00' : '16:00'})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Day">Day</SelectItem><SelectItem value="Night">Night</SelectItem><SelectItem value="Patrol">Patrol</SelectItem></SelectContent></Select></div><div><Label>Post Area</Label><Input value={assignForm.postArea} onChange={e => setAssignForm({...assignForm, postArea: e.target.value})} placeholder="e.g. Bole Area" /></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Start Time</Label><Input type="time" value={assignForm.startTime} onChange={e => setAssignForm({...assignForm, startTime: e.target.value})} /></div><div><Label>End Time</Label><Input type="time" value={assignForm.endTime} onChange={e => setAssignForm({...assignForm, endTime: e.target.value})} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleAssign}>Assign</Button></DialogFooter></DialogContent></Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="duties">Duty Assignments</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger></TabsList>

        <TabsContent value="duties" className="mt-4">
          <Card><CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <Table><TableHeader><TableRow><TableHead>Officer</TableHead><TableHead>Badge</TableHead><TableHead>Shift</TableHead><TableHead>Post Area</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
                duties.length === 0 ? <SkeletonRow /> :
                duties.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.officer?.name || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-sm text-violet-700">{d.officer?.badgeNumber || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={`${d.shiftType === 'Night' ? 'border-slate-400 text-slate-700 bg-slate-50' : d.shiftType === 'Patrol' ? 'border-violet-200 text-violet-700 bg-violet-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>{d.shiftType}</Badge></TableCell>
                    <TableCell>{d.postArea || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.startTime} - {d.endTime}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card><CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <Table><TableHeader><TableRow><TableHead>Officer</TableHead><TableHead>Badge</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
                officers.length === 0 ? <SkeletonRow /> :
                officers.map(o => {
                  const att = todayAttendance(o.id)
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell className="font-mono text-sm text-violet-700">{o.badgeNumber}</TableCell>
                      <TableCell className="text-sm">{att?.checkIn ? fmtTime(att.checkIn) : '—'}</TableCell>
                      <TableCell className="text-sm">{att?.checkOut ? fmtTime(att.checkOut) : '—'}</TableCell>
                      <TableCell className="text-sm">{att?.hoursWorked ? `${att.hoursWorked}h` : '—'}</TableCell>
                      <TableCell><StatusBadge status={att?.status || 'Absent'} /></TableCell>
                      <TableCell className="text-right">
                        {!att ? <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleCheckIn(o.id)}><UserCheck className="h-3 w-3 mr-1" />Check In</Button> :
                        !att.checkOut ? <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleCheckOut(o.id)}><Clock className="h-3 w-3 mr-1" />Check Out</Button> :
                        <span className="text-xs text-muted-foreground">Completed</span>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody></Table>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ========== LEAVE MODULE ==========
function LeaveModule() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [officers, setOfficers] = useState<Officer[]>([])
  const [form, setForm] = useState({ officerId: '', leaveType: 'Annual', startDate: '', endDate: '', days: 1, reason: '' })

  const loadLeaves = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    Promise.all([
      fetch(`/api/leave-requests?${params}`).then(r => r.json()),
      fetch('/api/officers').then(r => r.json()),
    ]).then(([l, o]) => { setLeaves(Array.isArray(l) ? l : []); setOfficers(Array.isArray(o) ? o : []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    Promise.all([
      fetch(`/api/leave-requests?${params}`).then(r => r.json()),
      fetch('/api/officers').then(r => r.json()),
    ]).then(([l, o]) => { setLeaves(Array.isArray(l) ? l : []); setOfficers(Array.isArray(o) ? o : []); setLoading(false) }).catch(() => setLoading(false))
  }, [filterStatus])

  const handleCreate = async () => {
    if (!form.officerId || !form.startDate || !form.endDate) return
    const start = new Date(form.startDate); const end = new Date(form.endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const res = await fetch('/api/leave-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, days }) })
    if (res.ok) { setShowCreate(false); setForm({ officerId: '', leaveType: 'Annual', startDate: '', endDate: '', days: 1, reason: '' }); loadLeaves() }
  }

  const handleApprove = async (id: string) => {
    await fetch(`/api/leave-requests/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Approved', approvedBy: 'Admin User' }) })
    loadLeaves()
  }

  const handleReject = async (id: string) => {
    await fetch(`/api/leave-requests/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Rejected', approvedBy: 'Admin User' }) })
    loadLeaves()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this leave request?')) return
    await fetch(`/api/leave-requests/${id}`, { method: 'DELETE' })
    loadLeaves()
  }

  const pendingCount = leaves.filter(l => l.status === 'Pending').length

  return (
    <div className="space-y-4">
      {pendingCount > 0 && <Alert className="border-amber-200 bg-amber-50"><AlertTriangle className="h-4 w-4 text-amber-600" /><AlertTitle className="text-amber-800">Pending Approval</AlertTitle><AlertDescription className="text-amber-700">You have {pendingCount} leave request{pendingCount > 1 ? 's' : ''} awaiting approval.</AlertDescription></Alert>}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Filter Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select>
            <div className="sm:ml-auto">
              <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> New Request</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div><Label>Officer *</Label><Select value={form.officerId} onValueChange={v => setForm({...form, officerId: v})}><SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger><SelectContent>{officers.filter(o => o.status === 'Active').map(o => <SelectItem key={o.id} value={o.id}>{o.name} ({o.badgeNumber})</SelectItem>)}</SelectContent></Select></div><div><Label>Leave Type</Label><Select value={form.leaveType} onValueChange={v => setForm({...form, leaveType: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Annual">Annual</SelectItem><SelectItem value="Sick">Sick</SelectItem><SelectItem value="Emergency">Emergency</SelectItem><SelectItem value="Maternity">Maternity</SelectItem></SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div><div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div></div><div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCreate}>Submit</Button></DialogFooter></DialogContent></Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table><TableHeader><TableRow><TableHead>Officer</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
              {loading ? <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
              leaves.length === 0 ? <SkeletonRow /> :
              leaves.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.officer?.name || 'Unknown'}</TableCell>
                  <TableCell><Badge variant="outline" className="border-slate-200">{l.leaveType}</Badge></TableCell>
                  <TableCell className="text-sm">{fmt(l.startDate)}</TableCell>
                  <TableCell className="text-sm">{fmt(l.endDate)}</TableCell>
                  <TableCell className="text-sm">{l.days || '—'}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{l.reason || '—'}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {l.status === 'Pending' && <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleApprove(l.id)} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleReject(l.id)} title="Reject"><XCircle className="h-4 w-4" /></Button>
                      </>}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(l.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ========== VEHICLES MODULE ==========
function VehiclesModule() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showFuelDialog, setShowFuelDialog] = useState(false)
  const [form, setForm] = useState({ registrationNumber: '', make: '', model: '', year: new Date().getFullYear(), vehicleType: 'Patrol Car', status: 'Available', insuranceExpiry: '', lastServiceDate: '', nextServiceDate: '', currentMileage: 0, notes: '' })
  const [assignForm, setAssignForm] = useState({ officerName: '', officerBadge: '', purpose: '', assignedDate: new Date().toISOString().split('T')[0] })
  const [fuelForm, setFuelForm] = useState({ date: new Date().toISOString().split('T')[0], fuelType: 'Diesel', liters: '', cost: '', mileage: '', filledBy: '' })

  const loadVehicles = () => {
    setLoading(true)
    fetch('/api/vehicles').then(r => r.json()).then(d => { setVehicles(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/vehicles').then(r => r.json()).then(d => { setVehicles(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    const res = await fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowCreate(false); setForm({ registrationNumber: '', make: '', model: '', year: new Date().getFullYear(), vehicleType: 'Patrol Car', status: 'Available', insuranceExpiry: '', lastServiceDate: '', nextServiceDate: '', currentMileage: 0, notes: '' }); loadVehicles() }
  }

  const handleUpdate = async () => {
    if (!editVehicle) return
    await fetch(`/api/vehicles/${editVehicle.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editVehicle) })
    setEditVehicle(null); loadVehicles()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
    setViewVehicle(null); loadVehicles()
  }

  const handleViewVehicle = async (id: string) => {
    const res = await fetch(`/api/vehicles/${id}`)
    if (res.ok) setViewVehicle(await res.json())
  }

  const handleAssignVehicle = async () => {
    if (!viewVehicle || !assignForm.officerName) return
    const res = await fetch(`/api/vehicles/${viewVehicle.id}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignForm) })
    if (res.ok) { setShowAssignDialog(false); setAssignForm({ officerName: '', officerBadge: '', purpose: '', assignedDate: new Date().toISOString().split('T')[0] }); handleViewVehicle(viewVehicle.id); loadVehicles() }
  }

  const handleReturnVehicle = async (assignmentId: string) => {
    if (!viewVehicle) return
    await fetch(`/api/vehicles/${viewVehicle.id}/assignments`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: assignmentId }) })
    handleViewVehicle(viewVehicle.id); loadVehicles()
  }

  const handleAddFuel = async () => {
    if (!viewVehicle || !fuelForm.liters) return
    const res = await fetch(`/api/vehicles/${viewVehicle.id}/fuel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fuelForm, liters: parseFloat(fuelForm.liters), cost: fuelForm.cost ? parseFloat(fuelForm.cost) : undefined, mileage: fuelForm.mileage ? parseInt(fuelForm.mileage) : undefined }) })
    if (res.ok) { setShowFuelDialog(false); setFuelForm({ date: new Date().toISOString().split('T')[0], fuelType: 'Diesel', liters: '', cost: '', mileage: '', filledBy: '' }); handleViewVehicle(viewVehicle.id) }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-end">
            <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> Add Vehicle</Button></DialogTrigger><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div><Label>Registration # *</Label><Input value={form.registrationNumber} onChange={e => setForm({...form, registrationNumber: e.target.value})} placeholder="GOV-PD-XXX" /></div><div><Label>Type</Label><Select value={form.vehicleType} onValueChange={v => setForm({...form, vehicleType: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Patrol Car">Patrol Car</SelectItem><SelectItem value="Motorcycle">Motorcycle</SelectItem><SelectItem value="Prisoner Transport">Prisoner Transport</SelectItem><SelectItem value="Administrative">Administrative</SelectItem><SelectItem value="SUV">SUV</SelectItem></SelectContent></Select></div></div><div className="grid grid-cols-3 gap-4"><div><Label>Make *</Label><Input value={form.make} onChange={e => setForm({...form, make: e.target.value})} /></div><div><Label>Model *</Label><Input value={form.model} onChange={e => setForm({...form, model: e.target.value})} /></div><div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value) || 2024})} /></div></div><div><Label>Mileage</Label><Input type="number" value={form.currentMileage} onChange={e => setForm({...form, currentMileage: parseInt(e.target.value) || 0})} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Insurance Expiry</Label><Input type="date" value={form.insuranceExpiry} onChange={e => setForm({...form, insuranceExpiry: e.target.value})} /></div><div><Label>Next Service</Label><Input type="date" value={form.nextServiceDate} onChange={e => setForm({...form, nextServiceDate: e.target.value})} /></div></div><div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCreate}>Add Vehicle</Button></DialogFooter></DialogContent></Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table><TableHeader><TableRow><TableHead>Registration</TableHead><TableHead>Vehicle</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead>Mileage</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Insurance</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
              {loading ? <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
              vehicles.length === 0 ? <SkeletonRow /> :
              vehicles.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm font-medium text-violet-700">{v.registrationNumber}</TableCell>
                  <TableCell className="font-medium">{v.make} {v.model}{v.year ? ` (${v.year})` : ''}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className="border-slate-200">{v.vehicleType}</Badge></TableCell>
                  <TableCell className="text-sm">{v.currentMileage.toLocaleString()} km</TableCell>
                  <TableCell><StatusBadge status={v.status} /></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{fmt(v.insuranceExpiry)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewVehicle(v.id)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditVehicle(v)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>

      {/* View Vehicle Dialog */}
      <Dialog open={!!viewVehicle} onOpenChange={() => setViewVehicle(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewVehicle && <>
            <DialogHeader>
              <div className="flex items-center gap-3"><Car className="h-6 w-6 text-violet-600" /><div><DialogTitle className="font-mono">{viewVehicle.registrationNumber}</DialogTitle><DialogDescription>{viewVehicle.make} {viewVehicle.model} ({viewVehicle.year || 'N/A'}) • {viewVehicle.vehicleType}</DialogDescription></div><StatusBadge status={viewVehicle.status} /></div>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              <div className="bg-slate-50 p-3 rounded-lg text-center"><p className="text-xs text-muted-foreground">Mileage</p><p className="font-bold text-lg">{viewVehicle.currentMileage.toLocaleString()}</p><p className="text-xs text-muted-foreground">km</p></div>
              <div className="bg-slate-50 p-3 rounded-lg text-center"><p className="text-xs text-muted-foreground">Insurance</p><p className="font-medium text-sm mt-1">{fmt(viewVehicle.insuranceExpiry)}</p></div>
              <div className="bg-slate-50 p-3 rounded-lg text-center"><p className="text-xs text-muted-foreground">Last Service</p><p className="font-medium text-sm mt-1">{fmt(viewVehicle.lastServiceDate)}</p></div>
              <div className="bg-slate-50 p-3 rounded-lg text-center"><p className="text-xs text-muted-foreground">Next Service</p><p className={`font-medium text-sm mt-1 ${viewVehicle.nextServiceDate && new Date(viewVehicle.nextServiceDate) < new Date() ? 'text-red-600' : ''}`}>{fmt(viewVehicle.nextServiceDate)}</p></div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => { setEditVehicle(viewVehicle); setViewVehicle(null) }}><Edit className="h-4 w-4 mr-1" />Edit</Button>
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(viewVehicle.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 ml-auto" onClick={() => setShowAssignDialog(true)}><CarFront className="h-4 w-4 mr-1" />Assign</Button>
              <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setShowFuelDialog(true)}><Fuel className="h-4 w-4 mr-1" />Add Fuel</Button>
            </div>
            <Tabs defaultValue="assignments" className="mt-4">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="assignments">Assignments ({viewVehicle.assignments?.length || 0})</TabsTrigger><TabsTrigger value="fuel">Fuel Logs ({viewVehicle.fuelLogs?.length || 0})</TabsTrigger></TabsList>
              <TabsContent value="assignments" className="mt-4">
                <div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Officer</TableHead><TableHead>Badge</TableHead><TableHead>Purpose</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{(!viewVehicle.assignments || viewVehicle.assignments.length === 0) ? <SkeletonRow /> : viewVehicle.assignments.map(a => (<TableRow key={a.id}><TableCell className="font-medium text-sm">{a.officerName || '—'}</TableCell><TableCell className="font-mono text-sm">{a.officerBadge || '—'}</TableCell><TableCell className="text-sm max-w-[150px] truncate">{a.purpose || '—'}</TableCell><TableCell className="text-sm">{fmt(a.assignedDate)}</TableCell><TableCell><StatusBadge status={a.status} /></TableCell><TableCell className="text-right">{a.status === 'Assigned' && <Button size="sm" variant="outline" className="text-amber-600 border-amber-200" onClick={() => handleReturnVehicle(a.id)}>Return</Button>}</TableCell></TableRow>))}</TableBody></Table></div>
              </TabsContent>
              <TabsContent value="fuel" className="mt-4">
                <div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Liters</TableHead><TableHead>Cost</TableHead><TableHead>Mileage</TableHead><TableHead>Filled By</TableHead></TableRow></TableHeader><TableBody>{(!viewVehicle.fuelLogs || viewVehicle.fuelLogs.length === 0) ? <SkeletonRow /> : viewVehicle.fuelLogs.map(f => (<TableRow key={f.id}><TableCell className="text-sm">{fmt(f.date)}</TableCell><TableCell><Badge variant="outline" className="border-slate-200">{f.fuelType}</Badge></TableCell><TableCell className="text-sm">{f.liters}L</TableCell><TableCell className="text-sm">{f.cost ? `${f.cost.toLocaleString()} ETB` : '—'}</TableCell><TableCell className="text-sm">{f.mileage?.toLocaleString() || '—'} km</TableCell><TableCell className="text-sm">{f.filledBy || '—'}</TableCell></TableRow>))}</TableBody></Table></div>
              </TabsContent>
            </Tabs>
          </>}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent><DialogHeader><DialogTitle>Assign Vehicle</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div><Label>Officer Name *</Label><Input value={assignForm.officerName} onChange={e => setAssignForm({...assignForm, officerName: e.target.value})} /></div><div><Label>Badge Number</Label><Input value={assignForm.officerBadge} onChange={e => setAssignForm({...assignForm, officerBadge: e.target.value})} /></div><div><Label>Purpose</Label><Textarea value={assignForm.purpose} onChange={e => setAssignForm({...assignForm, purpose: e.target.value})} rows={2} /></div><div><Label>Date</Label><Input type="date" value={assignForm.assignedDate} onChange={e => setAssignForm({...assignForm, assignedDate: e.target.value})} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleAssignVehicle}>Assign</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* Fuel Dialog */}
      <Dialog open={showFuelDialog} onOpenChange={setShowFuelDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Fuel Log</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div><Label>Date</Label><Input type="date" value={fuelForm.date} onChange={e => setFuelForm({...fuelForm, date: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Fuel Type</Label><Select value={fuelForm.fuelType} onValueChange={v => setFuelForm({...fuelForm, fuelType: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Petrol">Petrol</SelectItem></SelectContent></Select></div><div><Label>Liters *</Label><Input type="number" value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm, liters: e.target.value})} /></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Cost (ETB)</Label><Input type="number" value={fuelForm.cost} onChange={e => setFuelForm({...fuelForm, cost: e.target.value})} /></div><div><Label>Mileage (km)</Label><Input type="number" value={fuelForm.mileage} onChange={e => setFuelForm({...fuelForm, mileage: e.target.value})} /></div></div><div><Label>Filled By</Label><Input value={fuelForm.filledBy} onChange={e => setFuelForm({...fuelForm, filledBy: e.target.value})} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowFuelDialog(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleAddFuel}>Add Fuel Log</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={!!editVehicle} onOpenChange={() => setEditVehicle(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Vehicle</DialogTitle></DialogHeader>
          {editVehicle && <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div><Label>Registration #</Label><Input value={editVehicle.registrationNumber} onChange={e => setEditVehicle({...editVehicle, registrationNumber: e.target.value})} /></div><div><Label>Status</Label><Select value={editVehicle.status} onValueChange={v => setEditVehicle({...editVehicle, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Available">Available</SelectItem><SelectItem value="Assigned">Assigned</SelectItem><SelectItem value="Maintenance">Maintenance</SelectItem><SelectItem value="Out of Service">Out of Service</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-3 gap-4"><div><Label>Make</Label><Input value={editVehicle.make} onChange={e => setEditVehicle({...editVehicle, make: e.target.value})} /></div><div><Label>Model</Label><Input value={editVehicle.model} onChange={e => setEditVehicle({...editVehicle, model: e.target.value})} /></div><div><Label>Year</Label><Input type="number" value={editVehicle.year || ''} onChange={e => setEditVehicle({...editVehicle, year: parseInt(e.target.value) || undefined})} /></div></div>
            <div><Label>Mileage</Label><Input type="number" value={editVehicle.currentMileage} onChange={e => setEditVehicle({...editVehicle, currentMileage: parseInt(e.target.value) || 0})} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Insurance Expiry</Label><Input type="date" value={editVehicle.insuranceExpiry ? editVehicle.insuranceExpiry.split('T')[0] : ''} onChange={e => setEditVehicle({...editVehicle, insuranceExpiry: e.target.value})} /></div><div><Label>Next Service</Label><Input type="date" value={editVehicle.nextServiceDate ? editVehicle.nextServiceDate.split('T')[0] : ''} onChange={e => setEditVehicle({...editVehicle, nextServiceDate: e.target.value})} /></div></div>
            <div><Label>Notes</Label><Textarea value={editVehicle.notes || ''} onChange={e => setEditVehicle({...editVehicle, notes: e.target.value})} rows={2} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditVehicle(null)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleUpdate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== EQUIPMENT MODULE ==========
function EquipmentModule() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterCondition, setFilterCondition] = useState('')
  const [editItem, setEditItem] = useState<Equipment | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ itemCode: '', name: '', category: 'Communication', quantity: 1, availableQty: 1, condition: 'Good', storageLocation: '', lastChecked: '' })

  const loadEquipment = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterCategory) params.set('category', filterCategory)
    if (filterCondition) params.set('condition', filterCondition)
    fetch(`/api/equipment?${params}`).then(r => r.json()).then(d => { setEquipment(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterCategory) params.set('category', filterCategory)
    if (filterCondition) params.set('condition', filterCondition)
    fetch(`/api/equipment?${params}`).then(r => r.json()).then(d => { setEquipment(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [filterCategory, filterCondition])

  const handleCreate = async () => {
    const res = await fetch('/api/equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowCreate(false); setForm({ itemCode: '', name: '', category: 'Communication', quantity: 1, availableQty: 1, condition: 'Good', storageLocation: '', lastChecked: '' }); loadEquipment() }
  }

  const handleUpdate = async () => {
    if (!editItem) return
    await fetch('/api/equipment', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) })
    setEditItem(null); loadEquipment()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this equipment item?')) return
    await fetch('/api/equipment', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadEquipment()
  }

  const totalItems = equipment.reduce((sum, e) => sum + e.quantity, 0)
  const totalAvailable = equipment.reduce((sum, e) => sum + e.availableQty, 0)
  const needsAttention = equipment.filter(e => e.condition === 'Poor' || e.condition === 'Needs Replacement').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wrench} label="Total Items" value={totalItems} sub={`${equipment.length} categories`} color="bg-violet-600" />
        <StatCard icon={CheckCircle} label="Available" value={totalAvailable} sub={`${totalItems - totalAvailable} in use`} color="bg-emerald-600" />
        <StatCard icon={AlertTriangle} label="Needs Attention" value={needsAttention} sub="Poor or needs replacement" color="bg-red-600" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filterCategory} onValueChange={v => setFilterCategory(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="Communication">Communication</SelectItem><SelectItem value="Protective Gear">Protective Gear</SelectItem><SelectItem value="Detection Equipment">Detection Equipment</SelectItem><SelectItem value="Traffic Equipment">Traffic Equipment</SelectItem><SelectItem value="Forensic Equipment">Forensic Equipment</SelectItem><SelectItem value="Crowd Control">Crowd Control</SelectItem><SelectItem value="Medical">Medical</SelectItem><SelectItem value="General Equipment">General Equipment</SelectItem></SelectContent></Select>
            <Select value={filterCondition} onValueChange={v => setFilterCondition(v === 'all' ? '' : v)}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Condition" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Good">Good</SelectItem><SelectItem value="Fair">Fair</SelectItem><SelectItem value="Poor">Poor</SelectItem><SelectItem value="Needs Replacement">Needs Replacement</SelectItem></SelectContent></Select>
            <div className="sm:ml-auto">
              <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-1" /> Add Equipment</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div><Label>Item Code *</Label><Input value={form.itemCode} onChange={e => setForm({...form, itemCode: e.target.value})} placeholder="EQ-XXX" /></div><div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({...form, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Communication">Communication</SelectItem><SelectItem value="Protective Gear">Protective Gear</SelectItem><SelectItem value="Detection Equipment">Detection Equipment</SelectItem><SelectItem value="Traffic Equipment">Traffic Equipment</SelectItem><SelectItem value="Forensic Equipment">Forensic Equipment</SelectItem><SelectItem value="Crowd Control">Crowd Control</SelectItem><SelectItem value="Medical">Medical</SelectItem><SelectItem value="General Equipment">General Equipment</SelectItem></SelectContent></Select></div></div><div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})} /></div><div><Label>Available Qty</Label><Input type="number" value={form.availableQty} onChange={e => setForm({...form, availableQty: parseInt(e.target.value) || 1})} /></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Condition</Label><Select value={form.condition} onValueChange={v => setForm({...form, condition: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Good">Good</SelectItem><SelectItem value="Fair">Fair</SelectItem><SelectItem value="Poor">Poor</SelectItem><SelectItem value="Needs Replacement">Needs Replacement</SelectItem></SelectContent></Select></div><div><Label>Last Checked</Label><Input type="date" value={form.lastChecked} onChange={e => setForm({...form, lastChecked: e.target.value})} /></div></div><div><Label>Storage Location</Label><Input value={form.storageLocation} onChange={e => setForm({...form, storageLocation: e.target.value})} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCreate}>Add Equipment</Button></DialogFooter></DialogContent></Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Qty</TableHead><TableHead>Available</TableHead><TableHead>Condition</TableHead><TableHead className="hidden md:table-cell">Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
              {loading ? <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
              equipment.length === 0 ? <SkeletonRow /> :
              equipment.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm font-medium text-violet-700">{e.itemCode}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell><Badge variant="outline" className="border-slate-200">{e.category}</Badge></TableCell>
                  <TableCell>{e.quantity}</TableCell>
                  <TableCell className={e.availableQty < e.quantity * 0.5 ? 'text-red-600 font-medium' : ''}>{e.availableQty}</TableCell>
                  <TableCell><StatusBadge status={e.condition} /></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{e.storageLocation || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(e)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Equipment Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Equipment - {editItem?.itemCode}</DialogTitle></DialogHeader>
          {editItem && <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div><Label>Item Code</Label><Input value={editItem.itemCode} onChange={e => setEditItem({...editItem, itemCode: e.target.value})} /></div><div><Label>Name</Label><Input value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} /></div></div>
            <div><Label>Category</Label><Select value={editItem.category} onValueChange={v => setEditItem({...editItem, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Communication">Communication</SelectItem><SelectItem value="Protective Gear">Protective Gear</SelectItem><SelectItem value="Detection Equipment">Detection Equipment</SelectItem><SelectItem value="Traffic Equipment">Traffic Equipment</SelectItem><SelectItem value="Forensic Equipment">Forensic Equipment</SelectItem><SelectItem value="Crowd Control">Crowd Control</SelectItem><SelectItem value="Medical">Medical</SelectItem><SelectItem value="General Equipment">General Equipment</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Quantity</Label><Input type="number" value={editItem.quantity} onChange={e => setEditItem({...editItem, quantity: parseInt(e.target.value) || 1})} /></div><div><Label>Available</Label><Input type="number" value={editItem.availableQty} onChange={e => setEditItem({...editItem, availableQty: parseInt(e.target.value) || 0})} /></div></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Condition</Label><Select value={editItem.condition} onValueChange={v => setEditItem({...editItem, condition: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Good">Good</SelectItem><SelectItem value="Fair">Fair</SelectItem><SelectItem value="Poor">Poor</SelectItem><SelectItem value="Needs Replacement">Needs Replacement</SelectItem></SelectContent></Select></div><div><Label>Last Checked</Label><Input type="date" value={editItem.lastChecked ? editItem.lastChecked.split('T')[0] : ''} onChange={e => setEditItem({...editItem, lastChecked: e.target.value})} /></div></div>
            <div><Label>Storage Location</Label><Input value={editItem.storageLocation || ''} onChange={e => setEditItem({...editItem, storageLocation: e.target.value})} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleUpdate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== REPORTS MODULE ==========
function ReportsModule() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [firs, setFirs] = useState<FIR[]>([])
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/firs').then(r => r.json()),
      fetch('/api/officers').then(r => r.json()),
    ]).then(([d, f, o]) => {
      setDashboard(d); setFirs(Array.isArray(f) ? f : []); setOfficers(Array.isArray(o) ? o : []); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i)=><Card key={i}><CardContent className="p-6 h-48 bg-slate-100 animate-pulse rounded-lg"/></Card>)}</div></div>
  if (!dashboard) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load report data.</AlertDescription></Alert>

  const closureRate = dashboard.totalFIRs > 0 ? Math.round((dashboard.closedFIRs / dashboard.totalFIRs) * 100) : 0
  const activeRate = dashboard.totalOfficers > 0 ? Math.round((dashboard.activeOfficers / dashboard.totalOfficers) * 100) : 0
  const vehicleReadyRate = dashboard.totalVehicles > 0 ? Math.round(((dashboard.availableVehicles + dashboard.assignedVehicles) / dashboard.totalVehicles) * 100) : 0

  const deptCount: Record<string, number> = {}
  officers.forEach(o => { deptCount[o.department] = (deptCount[o.department] || 0) + 1 })

  const statusCount: Record<string, number> = {}
  firs.forEach(f => { statusCount[f.status] = (statusCount[f.status] || 0) + 1 })

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">FIR Closure Rate</CardTitle></CardHeader>
          <CardContent><div className="flex items-end gap-2"><span className="text-3xl font-bold text-violet-700">{closureRate}%</span><TrendingUp className="h-5 w-5 text-emerald-500 mb-1" /></div><div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-violet-600 rounded-full" style={{ width: `${closureRate}%` }} /></div><p className="text-xs text-muted-foreground mt-1">{dashboard.closedFIRs} of {dashboard.totalFIRs} FIRs closed</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Officer Availability</CardTitle></CardHeader>
          <CardContent><div className="flex items-end gap-2"><span className="text-3xl font-bold text-emerald-600">{activeRate}%</span><Activity className="h-5 w-5 text-emerald-500 mb-1" /></div><div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-600 rounded-full" style={{ width: `${activeRate}%` }} /></div><p className="text-xs text-muted-foreground mt-1">{dashboard.activeOfficers} of {dashboard.totalOfficers} officers active</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fleet Readiness</CardTitle></CardHeader>
          <CardContent><div className="flex items-end gap-2"><span className="text-3xl font-bold text-amber-600">{vehicleReadyRate}%</span><Car className="h-5 w-5 text-amber-500 mb-1" /></div><div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${vehicleReadyRate}%` }} /></div><p className="text-xs text-muted-foreground mt-1">{dashboard.maintenanceVehicles} in maintenance</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crime Category Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Crime Category Breakdown</CardTitle><CardDescription>Distribution of FIRs by crime type</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {(dashboard.crimeByCategory || []).length === 0 ? <p className="text-sm text-muted-foreground">No data</p> :
            dashboard.crimeByCategory.sort((a, b) => b.count - a.count).map(c => {
              const pct = dashboard.totalFIRs > 0 ? Math.round((c.count / dashboard.totalFIRs) * 100) : 0
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="font-medium">{c.category}</span><span className="text-muted-foreground">{c.count} ({pct}%)</span></div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-violet-600 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* FIR Status Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">FIR Status Distribution</CardTitle><CardDescription>Current status of all filed reports</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries({ 'Open': dashboard.openFIRs, 'Under Investigation': dashboard.underInvestigationFIRs, 'Closed': dashboard.closedFIRs }).map(([status, count]) => {
              const pct = dashboard.totalFIRs > 0 ? Math.round((count / dashboard.totalFIRs) * 100) : 0
              const colors: Record<string, string> = { 'Open': 'bg-amber-500', 'Under Investigation': 'bg-violet-600', 'Closed': 'bg-emerald-600' }
              return (
                <div key={status} className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg ${colors[status]} flex items-center justify-center flex-shrink-0`}>{
                    status === 'Closed' ? <CheckCircle className="h-5 w-5 text-white" /> :
                    status === 'Open' ? <Clock className="h-5 w-5 text-white" /> :
                    <Search className="h-5 w-5 text-white" />
                  }</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1"><span className="font-medium">{status}</span><span className="font-bold">{count}</span></div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${colors[status]} rounded-full`} style={{ width: `${pct}%` }} /></div>
                  </div>
                  <span className="text-sm text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Officers by Department</CardTitle><CardDescription>Personnel distribution across departments</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(deptCount).map(([dept, count]) => (
                <div key={dept} className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center"><Users className="h-5 w-5 text-violet-600" /></div>
                  <div><p className="font-medium text-sm">{dept}</p><p className="text-lg font-bold text-violet-700">{count}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Fleet Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Vehicle Fleet Summary</CardTitle><CardDescription>Current status of all department vehicles</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries({ 'Available': dashboard.availableVehicles, 'Assigned': dashboard.assignedVehicles, 'Maintenance': dashboard.maintenanceVehicles }).map(([status, count]) => {
              const colors: Record<string, string> = { 'Available': 'bg-emerald-500', 'Assigned': 'bg-violet-600', 'Maintenance': 'bg-amber-500' }
              const icons: Record<string, React.ElementType> = { 'Available': CheckCircle, 'Assigned': Car, 'Maintenance': Wrench }
              const Icon = icons[status]
              return (
                <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg ${colors[status]} flex items-center justify-center`}><Icon className="h-4 w-4 text-white" /></div>
                    <span className="font-medium">{status}</span>
                  </div>
                  <span className="font-bold text-lg">{count}</span>
                </div>
              )
            })}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Vehicles</span>
                <span className="font-bold text-lg">{dashboard.totalVehicles}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Priority Analysis</CardTitle><CardDescription>FIR distribution by priority level</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(dashboard.firByPriority || []).map(p => {
              const colors: Record<string, string> = { 'Critical': 'border-red-200 bg-red-50', 'High': 'border-orange-200 bg-orange-50', 'Medium': 'border-amber-200 bg-amber-50', 'Low': 'border-emerald-200 bg-emerald-50' }
              const iconColors: Record<string, string> = { 'Critical': 'bg-red-600', 'High': 'bg-orange-500', 'Medium': 'bg-amber-500', 'Low': 'bg-emerald-600' }
              const icons: Record<string, React.ElementType> = { 'Critical': ShieldAlert, 'High': AlertTriangle, 'Medium': CircleDot, 'Low': CheckCircle }
              const Icon = icons[p.priority] || CircleDot
              return (
                <div key={p.priority} className={`border rounded-xl p-4 text-center ${colors[p.priority] || ''}`}>
                  <div className={`h-10 w-10 rounded-full ${iconColors[p.priority] || 'bg-slate-500'} flex items-center justify-center mx-auto mb-2`}><Icon className="h-5 w-5 text-white" /></div>
                  <p className="font-bold text-2xl">{p.count}</p>
                  <p className="text-sm font-medium">{p.priority}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
