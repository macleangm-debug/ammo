"""
Reports Routes
Comprehensive report generation for all AMMO stakeholders
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Header
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import io
import csv
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ammo_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/reports", tags=["reports"])


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        else:
            result[key] = value
    return result


# Auth dependency - inline to avoid circular import
async def get_current_user(
    cookie: Optional[str] = Header(None, alias="cookie"),
    authorization: Optional[str] = Header(None)
) -> dict:
    """Get current user from session or token"""
    session_token = None
    
    # Check cookie
    if cookie:
        for part in cookie.split(";"):
            if "session_token=" in part:
                session_token = part.split("session_token=")[1].strip()
                break
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    if session.get("expires_at"):
        try:
            expiry = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
            if expiry < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Session expired")
        except:
            pass
    
    return session.get("user", session)


def require_role(allowed_roles: list):
    """Dependency factory for role-based access control"""
    async def role_checker(user: dict = Depends(get_current_user)):
        user_role = user.get("role", "")
        if user_role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Access denied. Required roles: {allowed_roles}")
        return user
    return role_checker


# ============== HELPER FUNCTIONS ==============

def generate_pdf_report(title: str, subtitle: str, data: list, columns: list, summary: dict = None):
    """Generate a PDF report with header, table, and optional summary"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=6,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a365d')
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#4a5568')
    )
    
    # Header
    elements.append(Paragraph("AMMO - Accountable Munitions & Mobility Oversight", title_style))
    elements.append(Paragraph(title, ParagraphStyle('ReportTitle', parent=styles['Heading2'], alignment=TA_CENTER)))
    elements.append(Paragraph(subtitle, subtitle_style))
    elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Summary section if provided
    if summary:
        summary_data = [[k, str(v)] for k, v in summary.items()]
        summary_table = Table(summary_data, colWidths=[2.5*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f7fafc')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(Paragraph("Summary", styles['Heading3']))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
    
    # Data table
    if data and columns:
        # Calculate column widths
        available_width = 7.5 * inch
        col_width = available_width / len(columns)
        col_widths = [col_width] * len(columns)
        
        # Build table data with headers
        table_data = [columns]
        for row in data[:100]:  # Limit to 100 rows for PDF
            table_row = []
            for col in columns:
                val = row.get(col.lower().replace(' ', '_'), row.get(col, ''))
                if isinstance(val, (int, float)):
                    table_row.append(str(val))
                elif val is None:
                    table_row.append('')
                else:
                    # Truncate long strings
                    str_val = str(val)[:30]
                    table_row.append(str_val)
            table_data.append(table_row)
        
        data_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        data_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b5bdb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        ]))
        elements.append(data_table)
    
    # Footer
    elements.append(Spacer(1, 30))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.gray, alignment=TA_CENTER)
    elements.append(Paragraph("This is an official document generated by AMMO Platform. Confidential.", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def generate_csv_report(data: list, columns: list):
    """Generate a CSV report"""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[c.lower().replace(' ', '_') for c in columns], extrasaction='ignore')
    writer.writeheader()
    
    for row in data:
        # Normalize keys
        normalized_row = {}
        for col in columns:
            key = col.lower().replace(' ', '_')
            normalized_row[key] = row.get(key, row.get(col, ''))
        writer.writerow(normalized_row)
    
    return output.getvalue()


# ============== GOVERNMENT/ADMIN REPORTS ==============

@router.get("/government/compliance-summary")
async def get_compliance_summary_report(
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Compliance Summary Report"""
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get all profiles
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    
    # Calculate compliance metrics
    total = len(profiles)
    compliant = len([p for p in profiles if p.get("license_status") == "active" and p.get("fee_status") == "paid"])
    warning = len([p for p in profiles if p.get("fee_status") == "overdue"])
    suspended = len([p for p in profiles if p.get("license_status") == "suspended"])
    
    # Get violations in period
    violations = await db.compliance_warnings.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(5000)
    
    # Get enforcement actions
    enforcements = await db.enforcement_executions.find({
        "executed_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    summary = {
        "Report Period": f"Last {days} days",
        "Total Citizens": total,
        "Compliant": compliant,
        "Compliance Rate": f"{round(compliant/total*100, 1) if total > 0 else 0}%",
        "Warning Status": warning,
        "Suspended": suspended,
        "Total Violations": len(violations),
        "Enforcement Actions": len(enforcements)
    }
    
    # Detail data
    data = []
    for p in profiles:
        data.append({
            "user_id": p.get("user_id", ""),
            "name": p.get("name", "Unknown"),
            "license_status": p.get("license_status", "unknown"),
            "fee_status": p.get("fee_status", "unknown"),
            "license_expiry": p.get("license_expiry", "")[:10] if p.get("license_expiry") else "",
            "region": p.get("region", "Unassigned")
        })
    
    columns = ["User ID", "Name", "License Status", "Fee Status", "License Expiry", "Region"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(
            "Compliance Summary Report",
            f"Period: Last {days} days",
            data, columns, summary
        )
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=compliance_summary_{period}.pdf"}
        )
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=compliance_summary_{period}.csv"}
        )
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/government/revenue-collection")
async def get_revenue_collection_report(
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Revenue Collection Report"""
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get payments
    payments = await db.payments.find({
        "status": "completed",
        "payment_date": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Get fee payments
    fee_payments = await db.fee_payments.find({
        "paid_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Get outstanding balances
    profiles = await db.citizen_profiles.find({"fee_status": "overdue"}, {"_id": 0}).to_list(10000)
    outstanding = sum(p.get("accumulated_late_fees", 0) for p in profiles)
    
    total_payments = sum(p.get("amount", 0) for p in payments)
    total_fees = sum(f.get("amount", 0) for f in fee_payments)
    
    summary = {
        "Report Period": f"Last {days} days",
        "Total Payments": f"${total_payments:,.2f}",
        "License Fees Collected": f"${total_fees:,.2f}",
        "Total Revenue": f"${total_payments + total_fees:,.2f}",
        "Outstanding Balances": f"${outstanding:,.2f}",
        "Payment Count": len(payments) + len(fee_payments),
        "Overdue Accounts": len(profiles)
    }
    
    # Combine all payment records
    data = []
    for p in payments:
        data.append({
            "payment_id": p.get("payment_id", ""),
            "user_id": p.get("user_id", ""),
            "amount": f"${p.get('amount', 0):,.2f}",
            "type": p.get("type", "payment"),
            "status": p.get("status", ""),
            "date": p.get("payment_date", "")[:10] if p.get("payment_date") else ""
        })
    for f in fee_payments:
        data.append({
            "payment_id": f.get("payment_id", ""),
            "user_id": f.get("user_id", ""),
            "amount": f"${f.get('amount', 0):,.2f}",
            "type": "license_fee",
            "status": "completed",
            "date": f.get("paid_at", "")[:10] if f.get("paid_at") else ""
        })
    
    columns = ["Payment ID", "User ID", "Amount", "Type", "Status", "Date"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Revenue Collection Report", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=revenue_collection_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=revenue_collection_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/government/license-activity")
async def get_license_activity_report(
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate License Activity Report"""
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get licenses
    licenses = await db.licenses.find({}, {"_id": 0}).to_list(10000)
    applications = await db.license_applications.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(5000)
    
    new_licenses = [l for l in licenses if l.get("created_at", "") >= start_date.isoformat()]
    renewals = [a for a in applications if a.get("type") == "renewal"]
    revocations = [a for a in applications if a.get("status") == "revoked"]
    
    # Count by status
    pending = len([a for a in applications if a.get("status") == "pending"])
    approved = len([a for a in applications if a.get("status") == "approved"])
    rejected = len([a for a in applications if a.get("status") == "rejected"])
    
    summary = {
        "Report Period": f"Last {days} days",
        "New Registrations": len(new_licenses),
        "Renewal Applications": len(renewals),
        "Revocations": len(revocations),
        "Pending Applications": pending,
        "Approved": approved,
        "Rejected": rejected,
        "Total Active Licenses": len([l for l in licenses if l.get("status") == "active"])
    }
    
    data = []
    for a in applications:
        data.append({
            "application_id": a.get("application_id", ""),
            "user_id": a.get("user_id", ""),
            "type": a.get("type", "new"),
            "status": a.get("status", "pending"),
            "submitted": a.get("created_at", "")[:10] if a.get("created_at") else "",
            "reviewed": a.get("reviewed_at", "")[:10] if a.get("reviewed_at") else ""
        })
    
    columns = ["Application ID", "User ID", "Type", "Status", "Submitted", "Reviewed"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("License Activity Report", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=license_activity_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=license_activity_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/government/dealer-oversight")
async def get_dealer_oversight_report(
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Dealer Oversight Report"""
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get dealers
    dealers = await db.dealer_profiles.find({}, {"_id": 0}).to_list(1000)
    
    # Get transactions
    transactions = await db.transactions.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Get flagged transactions
    flagged = await db.flagged_transactions.find({
        "flagged_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    total_volume = sum(t.get("total_value", 0) for t in transactions)
    
    summary = {
        "Report Period": f"Last {days} days",
        "Total Dealers": len(dealers),
        "Active Dealers": len([d for d in dealers if d.get("status") == "active"]),
        "Total Transactions": len(transactions),
        "Transaction Volume": f"${total_volume:,.2f}",
        "Flagged Transactions": len(flagged),
        "Avg Transaction Value": f"${total_volume/len(transactions):,.2f}" if transactions else "$0.00"
    }
    
    # Dealer breakdown
    data = []
    for d in dealers:
        dealer_id = d.get("dealer_id", d.get("user_id", ""))
        dealer_txns = [t for t in transactions if t.get("dealer_id") == dealer_id]
        dealer_flagged = [f for f in flagged if f.get("dealer_id") == dealer_id]
        
        data.append({
            "dealer_id": dealer_id,
            "business_name": d.get("business_name", "Unknown"),
            "status": d.get("status", "unknown"),
            "transactions": len(dealer_txns),
            "volume": f"${sum(t.get('total_value', 0) for t in dealer_txns):,.2f}",
            "flagged": len(dealer_flagged)
        })
    
    columns = ["Dealer ID", "Business Name", "Status", "Transactions", "Volume", "Flagged"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Dealer Oversight Report", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=dealer_oversight_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=dealer_oversight_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/government/regional-performance")
async def get_regional_performance_report(
    format: str = "json",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Regional Performance Report"""
    regions = ["Northeast", "Southeast", "Midwest", "Southwest", "West"]
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    violations = await db.compliance_warnings.find({}, {"_id": 0}).to_list(5000)
    
    data = []
    total_citizens = len(profiles)
    
    for idx, region in enumerate(regions):
        # Assign profiles to regions
        region_profiles = [p for i, p in enumerate(profiles) if i % 5 == idx]
        region_user_ids = [p.get("user_id") for p in region_profiles]
        region_violations = [v for v in violations if v.get("user_id") in region_user_ids]
        
        compliant = len([p for p in region_profiles if p.get("license_status") == "active"])
        total = len(region_profiles)
        
        data.append({
            "region": region,
            "total_citizens": total,
            "compliant": compliant,
            "compliance_rate": f"{round(compliant/total*100, 1) if total > 0 else 0}%",
            "violations": len(region_violations),
            "suspended": len([p for p in region_profiles if p.get("license_status") == "suspended"])
        })
    
    summary = {
        "Total Citizens": total_citizens,
        "Regions Analyzed": len(regions),
        "Overall Compliance": f"{round(sum(int(d['compliance_rate'].replace('%','')) for d in data)/len(data), 1)}%",
        "Total Violations": sum(d['violations'] for d in data)
    }
    
    columns = ["Region", "Total Citizens", "Compliant", "Compliance Rate", "Violations", "Suspended"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Regional Performance Report", "All Regions Analysis", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=regional_performance.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=regional_performance.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/government/enforcement-actions")
async def get_enforcement_actions_report(
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Enforcement Actions Report"""
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get enforcement data
    executions = await db.enforcement_executions.find({
        "executed_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    # Get warnings sent
    warnings = await db.notifications.find({
        "type": {"$in": ["payment_warning", "final_warning", "suspension_notice"]},
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(5000)
    
    # Get suspensions
    suspended_profiles = await db.citizen_profiles.find({
        "license_status": "suspended"
    }, {"_id": 0}).to_list(1000)
    
    summary = {
        "Report Period": f"Last {days} days",
        "Enforcement Runs": len(executions),
        "Warnings Sent": len(warnings),
        "Current Suspensions": len(suspended_profiles),
        "First Warnings": len([w for w in warnings if w.get("type") == "payment_warning"]),
        "Final Warnings": len([w for w in warnings if w.get("type") == "final_warning"]),
        "Suspension Notices": len([w for w in warnings if w.get("type") == "suspension_notice"])
    }
    
    data = []
    for w in warnings[:100]:
        data.append({
            "notification_id": w.get("notification_id", ""),
            "user_id": w.get("user_id", ""),
            "type": w.get("type", ""),
            "title": w.get("title", "")[:40],
            "sent_at": w.get("created_at", "")[:10] if w.get("created_at") else ""
        })
    
    columns = ["Notification ID", "User ID", "Type", "Title", "Sent At"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Enforcement Actions Report", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=enforcement_actions_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=enforcement_actions_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/government/audit-trail")
async def get_audit_trail_report(
    format: str = "json",
    period: str = "7d",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Audit Trail Report"""
    days = int(period.replace("d", "")) if "d" in period else 7
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get audit logs
    audit_logs = await db.audit_logs.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("created_at", -1).to_list(5000)
    
    # Count by action type
    action_counts = {}
    for log in audit_logs:
        action = log.get("action", "unknown")
        action_counts[action] = action_counts.get(action, 0) + 1
    
    summary = {
        "Report Period": f"Last {days} days",
        "Total Actions": len(audit_logs),
        "Unique Actions": len(action_counts),
        "Top Actions": ", ".join([f"{k}: {v}" for k, v in sorted(action_counts.items(), key=lambda x: x[1], reverse=True)[:5]])
    }
    
    data = []
    for log in audit_logs[:200]:
        data.append({
            "timestamp": log.get("created_at", "")[:19] if log.get("created_at") else "",
            "user_id": log.get("user_id", ""),
            "action": log.get("action", ""),
            "role": log.get("role", ""),
            "target": log.get("target_id", "")[:20] if log.get("target_id") else ""
        })
    
    columns = ["Timestamp", "User ID", "Action", "Role", "Target"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Audit Trail Report", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=audit_trail_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_trail_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


# ============== LAW ENFORCEMENT REPORTS ==============

@router.get("/law-enforcement/flagged-transactions")
async def get_flagged_transactions_report(
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Flagged Transactions Report"""
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    flagged = await db.flagged_transactions.find({
        "flagged_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("flagged_at", -1).to_list(1000)
    
    # Count by status and severity
    by_status = {}
    by_severity = {}
    for f in flagged:
        status = f.get("status", "pending")
        severity = f.get("severity", "medium")
        by_status[status] = by_status.get(status, 0) + 1
        by_severity[severity] = by_severity.get(severity, 0) + 1
    
    summary = {
        "Report Period": f"Last {days} days",
        "Total Flagged": len(flagged),
        "Pending Review": by_status.get("pending", 0),
        "Under Investigation": by_status.get("investigating", 0),
        "Resolved": by_status.get("resolved", 0),
        "High Severity": by_severity.get("high", 0),
        "Critical": by_severity.get("critical", 0)
    }
    
    data = []
    for f in flagged:
        data.append({
            "flag_id": f.get("flag_id", ""),
            "transaction_id": f.get("transaction_id", ""),
            "dealer_id": f.get("dealer_id", ""),
            "reason": f.get("reason", "")[:40],
            "severity": f.get("severity", "medium"),
            "status": f.get("status", "pending"),
            "flagged_at": f.get("flagged_at", "")[:10] if f.get("flagged_at") else ""
        })
    
    columns = ["Flag ID", "Transaction ID", "Dealer ID", "Reason", "Severity", "Status", "Flagged At"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Flagged Transactions Report", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=flagged_transactions_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=flagged_transactions_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/law-enforcement/stolen-firearms")
async def get_stolen_firearms_report(
    format: str = "json",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Stolen Firearms Report"""
    stolen = await db.stolen_firearms.find({}, {"_id": 0}).sort("reported_at", -1).to_list(1000)
    
    # Count by status
    by_status = {}
    for s in stolen:
        status = s.get("status", "stolen")
        by_status[status] = by_status.get(status, 0) + 1
    
    summary = {
        "Total Reports": len(stolen),
        "Currently Stolen": by_status.get("stolen", 0),
        "Recovered": by_status.get("recovered", 0),
        "Under Investigation": by_status.get("investigating", 0)
    }
    
    data = []
    for s in stolen:
        data.append({
            "report_id": s.get("report_id", ""),
            "serial_number": s.get("serial_number", ""),
            "firearm_type": s.get("firearm_type", ""),
            "owner_license": s.get("owner_license", ""),
            "status": s.get("status", "stolen"),
            "reported_at": s.get("reported_at", "")[:10] if s.get("reported_at") else ""
        })
    
    columns = ["Report ID", "Serial Number", "Firearm Type", "Owner License", "Status", "Reported At"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Stolen Firearms Report", "All Time", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=stolen_firearms.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=stolen_firearms.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/law-enforcement/high-risk-individuals")
async def get_high_risk_individuals_report(
    format: str = "json",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate High-Risk Individuals Report"""
    # Get profiles with multiple violations or risk factors
    profiles = await db.citizen_profiles.find({}, {"_id": 0}).to_list(10000)
    violations = await db.compliance_warnings.find({}, {"_id": 0}).to_list(10000)
    
    # Count violations per user
    violation_counts = {}
    for v in violations:
        user_id = v.get("user_id", "")
        violation_counts[user_id] = violation_counts.get(user_id, 0) + 1
    
    # Get predictions
    predictions = await db.risk_predictions.find({}, {"_id": 0}).to_list(10000)
    prediction_scores = {p.get("user_id"): p.get("risk_score", 0) for p in predictions}
    
    # Filter high-risk individuals
    high_risk = []
    for p in profiles:
        user_id = p.get("user_id", "")
        v_count = violation_counts.get(user_id, 0)
        risk_score = prediction_scores.get(user_id, 0)
        
        if v_count >= 2 or risk_score >= 70 or p.get("license_status") == "suspended":
            high_risk.append({
                "user_id": user_id,
                "name": p.get("name", "Unknown"),
                "license_status": p.get("license_status", ""),
                "violations": v_count,
                "risk_score": risk_score,
                "region": p.get("region", "Unknown")
            })
    
    # Sort by risk score
    high_risk.sort(key=lambda x: x["risk_score"], reverse=True)
    
    summary = {
        "Total High-Risk": len(high_risk),
        "Suspended Licenses": len([h for h in high_risk if h["license_status"] == "suspended"]),
        "Multiple Violations": len([h for h in high_risk if h["violations"] >= 2]),
        "High Risk Score (70+)": len([h for h in high_risk if h["risk_score"] >= 70])
    }
    
    data = high_risk[:100]
    columns = ["User ID", "Name", "License Status", "Violations", "Risk Score", "Region"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("High-Risk Individuals Report", "Current Status", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=high_risk_individuals.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=high_risk_individuals.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/law-enforcement/suspended-licenses")
async def get_suspended_licenses_report(
    format: str = "json",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Suspended Licenses Report"""
    suspended = await db.citizen_profiles.find(
        {"license_status": "suspended"},
        {"_id": 0}
    ).to_list(5000)
    
    summary = {
        "Total Suspended": len(suspended),
        "Report Generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    }
    
    data = []
    for s in suspended:
        data.append({
            "user_id": s.get("user_id", ""),
            "name": s.get("name", "Unknown"),
            "license_number": s.get("license_number", ""),
            "suspended_reason": s.get("suspended_reason", "Fee non-payment")[:40],
            "suspended_at": s.get("suspended_at", "")[:10] if s.get("suspended_at") else "",
            "outstanding_fees": f"${s.get('accumulated_late_fees', 0):,.2f}"
        })
    
    columns = ["User ID", "Name", "License Number", "Suspended Reason", "Suspended At", "Outstanding Fees"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report("Suspended Licenses Report", "Current Status", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=suspended_licenses.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=suspended_licenses.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/law-enforcement/transaction-lookup/{user_id}")
async def get_transaction_lookup_report(
    user_id: str,
    format: str = "json",
    user: dict = Depends(require_role(["admin"]))
):
    """Generate Transaction History Report for specific individual"""
    # Get user profile
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all transactions
    transactions = await db.transactions.find(
        {"$or": [{"buyer_id": user_id}, {"seller_id": user_id}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get firearms
    firearms = await db.registered_firearms.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    summary = {
        "Subject": profile.get("name", "Unknown"),
        "User ID": user_id,
        "License Status": profile.get("license_status", "unknown"),
        "Total Transactions": len(transactions),
        "Registered Firearms": len(firearms),
        "Report Generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    }
    
    data = []
    for t in transactions:
        role = "Buyer" if t.get("buyer_id") == user_id else "Seller"
        data.append({
            "transaction_id": t.get("transaction_id", ""),
            "role": role,
            "item_type": t.get("item_type", ""),
            "quantity": t.get("quantity", 0),
            "value": f"${t.get('total_value', 0):,.2f}",
            "date": t.get("created_at", "")[:10] if t.get("created_at") else ""
        })
    
    columns = ["Transaction ID", "Role", "Item Type", "Quantity", "Value", "Date"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Transaction Lookup: {profile.get('name', user_id)}", f"User ID: {user_id}", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=transaction_lookup_{user_id}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=transaction_lookup_{user_id}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


# ============== CITIZEN/MEMBER REPORTS ==============

@router.get("/citizen/license-certificate/{user_id}")
async def get_license_certificate(
    user_id: str,
    user: dict = Depends(require_role(["citizen", "admin"]))
):
    """Generate Official License Certificate PDF"""
    # Verify access (citizens can only access their own)
    if user.get("role") == "citizen" and user.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    license_data = await db.licenses.find_one({"user_id": user_id}, {"_id": 0})
    
    # Generate certificate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Certificate styling
    title_style = ParagraphStyle('CertTitle', parent=styles['Title'], fontSize=24, spaceAfter=20, alignment=TA_CENTER, textColor=colors.HexColor('#1a365d'))
    
    elements.append(Spacer(1, 50))
    elements.append(Paragraph("OFFICIAL LICENSE CERTIFICATE", title_style))
    elements.append(Paragraph("Accountable Munitions & Mobility Oversight", ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=14, alignment=TA_CENTER, textColor=colors.HexColor('#4a5568'))))
    elements.append(Spacer(1, 40))
    
    # Certificate content
    cert_data = [
        ["License Holder:", profile.get("name", "Unknown")],
        ["License Number:", profile.get("license_number", license_data.get("license_number", "N/A") if license_data else "N/A")],
        ["License Type:", profile.get("license_type", "Standard")],
        ["Status:", profile.get("license_status", "Active").upper()],
        ["Issue Date:", profile.get("license_issued", "N/A")[:10] if profile.get("license_issued") else "N/A"],
        ["Expiry Date:", profile.get("license_expiry", "N/A")[:10] if profile.get("license_expiry") else "N/A"],
        ["User ID:", user_id],
    ]
    
    cert_table = Table(cert_data, colWidths=[2*inch, 4*inch])
    cert_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(cert_table)
    
    elements.append(Spacer(1, 50))
    elements.append(Paragraph("This certificate is electronically generated and verified.", ParagraphStyle('Footer', fontSize=10, alignment=TA_CENTER, textColor=colors.gray)))
    elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ParagraphStyle('Footer', fontSize=10, alignment=TA_CENTER, textColor=colors.gray)))
    
    doc.build(elements)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=license_certificate_{user_id}.pdf"}
    )


@router.get("/citizen/firearm-registration/{user_id}")
async def get_firearm_registration_report(
    user_id: str,
    format: str = "json",
    user: dict = Depends(require_role(["citizen", "admin"]))
):
    """Generate Firearm Registration Report"""
    if user.get("role") == "citizen" and user.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    firearms = await db.registered_firearms.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    summary = {
        "Owner": profile.get("name", "Unknown") if profile else "Unknown",
        "User ID": user_id,
        "Total Registered": len(firearms),
        "Report Generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    }
    
    data = []
    for f in firearms:
        data.append({
            "registration_id": f.get("registration_id", ""),
            "serial_number": f.get("serial_number", ""),
            "make": f.get("make", ""),
            "model": f.get("model", ""),
            "caliber": f.get("caliber", ""),
            "registered_date": f.get("registered_at", "")[:10] if f.get("registered_at") else ""
        })
    
    columns = ["Registration ID", "Serial Number", "Make", "Model", "Caliber", "Registered Date"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Firearm Registration: {summary['Owner']}", f"User ID: {user_id}", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=firearm_registration_{user_id}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=firearm_registration_{user_id}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/citizen/training-transcript/{user_id}")
async def get_training_transcript(
    user_id: str,
    format: str = "json",
    user: dict = Depends(require_role(["citizen", "admin"]))
):
    """Generate Training Transcript"""
    if user.get("role") == "citizen" and user.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    enrollments = await db.course_enrollments.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    courses = await db.training_courses.find({}, {"_id": 0}).to_list(100)
    course_map = {c.get("course_id"): c for c in courses}
    
    completed = [e for e in enrollments if e.get("status") == "completed"]
    total_hours = sum(course_map.get(e.get("course_id"), {}).get("duration_hours", 0) for e in completed)
    
    summary = {
        "Student": profile.get("name", "Unknown") if profile else "Unknown",
        "User ID": user_id,
        "Courses Completed": len(completed),
        "Total Training Hours": total_hours,
        "Courses In Progress": len([e for e in enrollments if e.get("status") == "in_progress"])
    }
    
    data = []
    for e in enrollments:
        course = course_map.get(e.get("course_id"), {})
        data.append({
            "course_name": course.get("title", "Unknown Course"),
            "category": course.get("category", ""),
            "hours": course.get("duration_hours", 0),
            "status": e.get("status", "enrolled"),
            "completed_at": e.get("completed_at", "")[:10] if e.get("completed_at") else ""
        })
    
    columns = ["Course Name", "Category", "Hours", "Status", "Completed At"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Training Transcript: {summary['Student']}", f"User ID: {user_id}", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=training_transcript_{user_id}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=training_transcript_{user_id}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/citizen/payment-history/{user_id}")
async def get_payment_history_report(
    user_id: str,
    format: str = "json",
    user: dict = Depends(require_role(["citizen", "admin"]))
):
    """Generate Payment History Report"""
    if user.get("role") == "citizen" and user.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    payments = await db.payments.find({"user_id": user_id}, {"_id": 0}).sort("payment_date", -1).to_list(500)
    fee_payments = await db.fee_payments.find({"user_id": user_id}, {"_id": 0}).sort("paid_at", -1).to_list(500)
    
    total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    total_fees = sum(f.get("amount", 0) for f in fee_payments)
    
    summary = {
        "Account Holder": profile.get("name", "Unknown") if profile else "Unknown",
        "User ID": user_id,
        "Total Payments": len(payments) + len(fee_payments),
        "Total Amount Paid": f"${total_paid + total_fees:,.2f}",
        "Current Fee Status": profile.get("fee_status", "unknown") if profile else "unknown"
    }
    
    data = []
    for p in payments:
        data.append({
            "payment_id": p.get("payment_id", ""),
            "type": p.get("type", "payment"),
            "amount": f"${p.get('amount', 0):,.2f}",
            "status": p.get("status", ""),
            "date": p.get("payment_date", "")[:10] if p.get("payment_date") else ""
        })
    for f in fee_payments:
        data.append({
            "payment_id": f.get("payment_id", ""),
            "type": "license_fee",
            "amount": f"${f.get('amount', 0):,.2f}",
            "status": "completed",
            "date": f.get("paid_at", "")[:10] if f.get("paid_at") else ""
        })
    
    # Sort by date
    data.sort(key=lambda x: x["date"], reverse=True)
    
    columns = ["Payment ID", "Type", "Amount", "Status", "Date"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Payment History: {summary['Account Holder']}", f"User ID: {user_id}", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=payment_history_{user_id}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=payment_history_{user_id}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/citizen/compliance-status/{user_id}")
async def get_compliance_status_report(
    user_id: str,
    format: str = "json",
    user: dict = Depends(require_role(["citizen", "admin"]))
):
    """Generate Personal Compliance Status Report"""
    if user.get("role") == "citizen" and user.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = await db.citizen_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    violations = await db.compliance_warnings.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    firearms = await db.registered_firearms.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    summary = {
        "Name": profile.get("name", "Unknown"),
        "User ID": user_id,
        "License Status": profile.get("license_status", "unknown"),
        "Fee Status": profile.get("fee_status", "unknown"),
        "License Expiry": profile.get("license_expiry", "N/A")[:10] if profile.get("license_expiry") else "N/A",
        "Registered Firearms": len(firearms),
        "Compliance Warnings": len(violations),
        "Outstanding Fees": f"${profile.get('accumulated_late_fees', 0):,.2f}"
    }
    
    # Check compliance items
    data = [
        {"item": "License Valid", "status": "Pass" if profile.get("license_status") == "active" else "Fail", "details": profile.get("license_status", "")},
        {"item": "Fees Current", "status": "Pass" if profile.get("fee_status") == "paid" else "Fail", "details": profile.get("fee_status", "")},
        {"item": "No Active Violations", "status": "Pass" if len([v for v in violations if v.get("status") == "active"]) == 0 else "Warning", "details": f"{len(violations)} total warnings"},
        {"item": "Firearms Registered", "status": "Pass", "details": f"{len(firearms)} firearms"},
    ]
    
    columns = ["Item", "Status", "Details"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Compliance Status: {summary['Name']}", f"User ID: {user_id}", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=compliance_status_{user_id}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=compliance_status_{user_id}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


# ============== DEALER REPORTS ==============

@router.get("/dealer/sales-summary/{dealer_id}")
async def get_dealer_sales_summary(
    dealer_id: str,
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["dealer", "admin"]))
):
    """Generate Dealer Sales Summary Report"""
    if user.get("role") == "dealer" and user.get("user_id") != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    dealer = await db.dealer_profiles.find_one({"$or": [{"dealer_id": dealer_id}, {"user_id": dealer_id}]}, {"_id": 0})
    transactions = await db.transactions.find({
        "dealer_id": dealer_id,
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("created_at", -1).to_list(5000)
    
    total_revenue = sum(t.get("total_value", 0) for t in transactions)
    completed = [t for t in transactions if t.get("status") == "completed"]
    
    summary = {
        "Business Name": dealer.get("business_name", "Unknown") if dealer else "Unknown",
        "Dealer ID": dealer_id,
        "Report Period": f"Last {days} days",
        "Total Transactions": len(transactions),
        "Completed Sales": len(completed),
        "Total Revenue": f"${total_revenue:,.2f}",
        "Avg Transaction": f"${total_revenue/len(transactions):,.2f}" if transactions else "$0.00"
    }
    
    data = []
    for t in transactions:
        data.append({
            "transaction_id": t.get("transaction_id", ""),
            "buyer_id": t.get("buyer_id", ""),
            "item_type": t.get("item_type", ""),
            "quantity": t.get("quantity", 0),
            "value": f"${t.get('total_value', 0):,.2f}",
            "status": t.get("status", ""),
            "date": t.get("created_at", "")[:10] if t.get("created_at") else ""
        })
    
    columns = ["Transaction ID", "Buyer ID", "Item Type", "Quantity", "Value", "Status", "Date"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Sales Summary: {summary['Business Name']}", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=sales_summary_{dealer_id}_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=sales_summary_{dealer_id}_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/dealer/inventory/{dealer_id}")
async def get_dealer_inventory_report(
    dealer_id: str,
    format: str = "json",
    user: dict = Depends(require_role(["dealer", "admin"]))
):
    """Generate Dealer Inventory Report"""
    if user.get("role") == "dealer" and user.get("user_id") != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    dealer = await db.dealer_profiles.find_one({"$or": [{"dealer_id": dealer_id}, {"user_id": dealer_id}]}, {"_id": 0})
    inventory = await db.dealer_inventory.find({"dealer_id": dealer_id}, {"_id": 0}).to_list(1000)
    
    total_items = sum(i.get("quantity", 0) for i in inventory)
    total_value = sum(i.get("quantity", 0) * i.get("unit_price", 0) for i in inventory)
    
    summary = {
        "Business Name": dealer.get("business_name", "Unknown") if dealer else "Unknown",
        "Dealer ID": dealer_id,
        "Total SKUs": len(inventory),
        "Total Items": total_items,
        "Inventory Value": f"${total_value:,.2f}",
        "Report Generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    }
    
    data = []
    for i in inventory:
        data.append({
            "item_id": i.get("item_id", ""),
            "name": i.get("name", ""),
            "category": i.get("category", ""),
            "quantity": i.get("quantity", 0),
            "unit_price": f"${i.get('unit_price', 0):,.2f}",
            "total_value": f"${i.get('quantity', 0) * i.get('unit_price', 0):,.2f}"
        })
    
    columns = ["Item ID", "Name", "Category", "Quantity", "Unit Price", "Total Value"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Inventory Report: {summary['Business Name']}", f"Dealer ID: {dealer_id}", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=inventory_{dealer_id}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=inventory_{dealer_id}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/dealer/verification-log/{dealer_id}")
async def get_dealer_verification_log(
    dealer_id: str,
    format: str = "json",
    period: str = "30d",
    user: dict = Depends(require_role(["dealer", "admin"]))
):
    """Generate Customer Verification Log Report"""
    if user.get("role") == "dealer" and user.get("user_id") != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    days = int(period.replace("d", "")) if "d" in period else 30
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    dealer = await db.dealer_profiles.find_one({"$or": [{"dealer_id": dealer_id}, {"user_id": dealer_id}]}, {"_id": 0})
    verifications = await db.buyer_verifications.find({
        "dealer_id": dealer_id,
        "verified_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).sort("verified_at", -1).to_list(2000)
    
    passed = len([v for v in verifications if v.get("result") == "passed"])
    failed = len([v for v in verifications if v.get("result") == "failed"])
    
    summary = {
        "Business Name": dealer.get("business_name", "Unknown") if dealer else "Unknown",
        "Dealer ID": dealer_id,
        "Report Period": f"Last {days} days",
        "Total Verifications": len(verifications),
        "Passed": passed,
        "Failed": failed,
        "Pass Rate": f"{round(passed/len(verifications)*100, 1) if verifications else 0}%"
    }
    
    data = []
    for v in verifications:
        data.append({
            "verification_id": v.get("verification_id", ""),
            "buyer_id": v.get("buyer_id", ""),
            "buyer_name": v.get("buyer_name", ""),
            "result": v.get("result", ""),
            "failure_reason": v.get("failure_reason", "")[:30] if v.get("result") == "failed" else "",
            "verified_at": v.get("verified_at", "")[:16] if v.get("verified_at") else ""
        })
    
    columns = ["Verification ID", "Buyer ID", "Buyer Name", "Result", "Failure Reason", "Verified At"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Verification Log: {summary['Business Name']}", f"Period: Last {days} days", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=verification_log_{dealer_id}_{period}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=verification_log_{dealer_id}_{period}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


@router.get("/dealer/compliance-audit/{dealer_id}")
async def get_dealer_compliance_audit(
    dealer_id: str,
    format: str = "json",
    user: dict = Depends(require_role(["dealer", "admin"]))
):
    """Generate Dealer Compliance Audit Report"""
    if user.get("role") == "dealer" and user.get("user_id") != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    dealer = await db.dealer_profiles.find_one({"$or": [{"dealer_id": dealer_id}, {"user_id": dealer_id}]}, {"_id": 0})
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
    
    # Get flagged transactions
    flagged = await db.flagged_transactions.find({"dealer_id": dealer_id}, {"_id": 0}).to_list(500)
    
    # Get all transactions
    transactions = await db.transactions.find({"dealer_id": dealer_id}, {"_id": 0}).to_list(5000)
    
    # Get verifications
    verifications = await db.buyer_verifications.find({"dealer_id": dealer_id}, {"_id": 0}).to_list(2000)
    failed_verifications = len([v for v in verifications if v.get("result") == "failed"])
    
    summary = {
        "Business Name": dealer.get("business_name", "Unknown"),
        "Dealer ID": dealer_id,
        "License Status": dealer.get("status", "unknown"),
        "Total Transactions": len(transactions),
        "Flagged Transactions": len(flagged),
        "Failed Verifications": failed_verifications,
        "Compliance Score": f"{max(0, 100 - len(flagged)*5 - failed_verifications*2)}%"
    }
    
    # Compliance checklist
    data = [
        {"item": "License Active", "status": "Pass" if dealer.get("status") == "active" else "Fail", "notes": dealer.get("status", "")},
        {"item": "Flagged Transaction Rate", "status": "Pass" if len(flagged)/max(len(transactions), 1) < 0.05 else "Warning", "notes": f"{len(flagged)} of {len(transactions)} ({round(len(flagged)/max(len(transactions), 1)*100, 1)}%)"},
        {"item": "Verification Compliance", "status": "Pass" if failed_verifications/max(len(verifications), 1) < 0.1 else "Warning", "notes": f"{len(verifications) - failed_verifications} passed, {failed_verifications} failed"},
        {"item": "Documentation Complete", "status": "Pass" if dealer.get("license_number") else "Fail", "notes": "License on file" if dealer.get("license_number") else "Missing"},
    ]
    
    columns = ["Item", "Status", "Notes"]
    
    if format == "pdf":
        pdf_content = generate_pdf_report(f"Compliance Audit: {summary['Business Name']}", f"Dealer ID: {dealer_id}", data, columns, summary)
        return Response(content=pdf_content, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=compliance_audit_{dealer_id}.pdf"})
    elif format == "csv":
        csv_content = generate_csv_report(data, columns)
        return Response(content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=compliance_audit_{dealer_id}.csv"})
    
    return {"summary": summary, "data": data, "columns": columns}


# ============== REPORT CATALOG ==============

@router.get("/catalog")
async def get_report_catalog(user: dict = Depends(require_role(["citizen", "dealer", "admin"]))):
    """Get list of all available reports based on user role"""
    role = user.get("role", "citizen")
    user_id = user.get("user_id", "")
    
    catalog = []
    
    # Government/Admin reports
    if role == "admin":
        catalog.extend([
            {"category": "Government", "name": "Compliance Summary", "endpoint": "/reports/government/compliance-summary", "formats": ["json", "csv", "pdf"]},
            {"category": "Government", "name": "Revenue Collection", "endpoint": "/reports/government/revenue-collection", "formats": ["json", "csv", "pdf"]},
            {"category": "Government", "name": "License Activity", "endpoint": "/reports/government/license-activity", "formats": ["json", "csv", "pdf"]},
            {"category": "Government", "name": "Dealer Oversight", "endpoint": "/reports/government/dealer-oversight", "formats": ["json", "csv", "pdf"]},
            {"category": "Government", "name": "Regional Performance", "endpoint": "/reports/government/regional-performance", "formats": ["json", "csv", "pdf"]},
            {"category": "Government", "name": "Enforcement Actions", "endpoint": "/reports/government/enforcement-actions", "formats": ["json", "csv", "pdf"]},
            {"category": "Government", "name": "Audit Trail", "endpoint": "/reports/government/audit-trail", "formats": ["json", "csv", "pdf"]},
            {"category": "Law Enforcement", "name": "Flagged Transactions", "endpoint": "/reports/law-enforcement/flagged-transactions", "formats": ["json", "csv", "pdf"]},
            {"category": "Law Enforcement", "name": "Stolen Firearms", "endpoint": "/reports/law-enforcement/stolen-firearms", "formats": ["json", "csv", "pdf"]},
            {"category": "Law Enforcement", "name": "High-Risk Individuals", "endpoint": "/reports/law-enforcement/high-risk-individuals", "formats": ["json", "csv", "pdf"]},
            {"category": "Law Enforcement", "name": "Suspended Licenses", "endpoint": "/reports/law-enforcement/suspended-licenses", "formats": ["json", "csv", "pdf"]},
        ])
    
    # Citizen reports
    if role in ["citizen", "admin"]:
        catalog.extend([
            {"category": "Citizen", "name": "License Certificate", "endpoint": f"/reports/citizen/license-certificate/{user_id}", "formats": ["pdf"]},
            {"category": "Citizen", "name": "Firearm Registration", "endpoint": f"/reports/citizen/firearm-registration/{user_id}", "formats": ["json", "csv", "pdf"]},
            {"category": "Citizen", "name": "Training Transcript", "endpoint": f"/reports/citizen/training-transcript/{user_id}", "formats": ["json", "csv", "pdf"]},
            {"category": "Citizen", "name": "Payment History", "endpoint": f"/reports/citizen/payment-history/{user_id}", "formats": ["json", "csv", "pdf"]},
            {"category": "Citizen", "name": "Compliance Status", "endpoint": f"/reports/citizen/compliance-status/{user_id}", "formats": ["json", "csv", "pdf"]},
        ])
    
    # Dealer reports
    if role in ["dealer", "admin"]:
        dealer_id = user_id if role == "dealer" else "{dealer_id}"
        catalog.extend([
            {"category": "Dealer", "name": "Sales Summary", "endpoint": f"/reports/dealer/sales-summary/{dealer_id}", "formats": ["json", "csv", "pdf"]},
            {"category": "Dealer", "name": "Inventory Report", "endpoint": f"/reports/dealer/inventory/{dealer_id}", "formats": ["json", "csv", "pdf"]},
            {"category": "Dealer", "name": "Verification Log", "endpoint": f"/reports/dealer/verification-log/{dealer_id}", "formats": ["json", "csv", "pdf"]},
            {"category": "Dealer", "name": "Compliance Audit", "endpoint": f"/reports/dealer/compliance-audit/{dealer_id}", "formats": ["json", "csv", "pdf"]},
        ])
    
    return {"catalog": catalog, "role": role}
