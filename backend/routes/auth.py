"""
Authentication routes
"""
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Response, Request, Depends

from utils import db, serialize_doc, create_audit_log, require_auth
from models import LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token via Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session_data = auth_response.json()
    
    email = session_data.get("email")
    name = session_data.get("name")
    picture = session_data.get("picture")
    session_token = session_data.get("session_token")
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "citizen",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    await create_audit_log("user_login", user_id, user.get("role", "citizen"), details={"email": email})
    
    return serialize_doc(user)


@router.get("/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    from utils.helpers import get_current_user
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return serialize_doc(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}


@router.post("/set-role")
async def set_user_role(request: Request, user: dict = Depends(require_auth(["admin"]))):
    """Admin endpoint to set user role"""
    body = await request.json()
    target_user_id = body.get("user_id")
    new_role = body.get("role")
    
    if new_role not in ["citizen", "dealer", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"user_id": target_user_id},
        {"$set": {"role": new_role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await create_audit_log("role_change", user["user_id"], "admin", target_user_id, {"new_role": new_role})
    
    return {"message": "Role updated"}


@router.post("/login")
async def auth_login(login_data: LoginRequest, response: Response):
    """Login with username and password"""
    demo_credentials = {
        "citizen": {"username": "citizen", "password": "demo123", "user_id": "demo_citizen_001"},
        "dealer": {"username": "dealer", "password": "demo123", "user_id": "demo_dealer_001"},
        "admin": {"username": "admin", "password": "admin123", "user_id": "demo_admin_001"},
    }
    
    user_id = None
    for role, creds in demo_credentials.items():
        if creds["username"] == login_data.username and creds["password"] == login_data.password:
            user_id = creds["user_id"]
            break
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        # Auto-create demo user if not exists
        demo_data = {
            "demo_citizen_001": {
                "user_id": "demo_citizen_001",
                "email": "demo.citizen@aegis.gov",
                "name": "John Citizen",
                "role": "citizen",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            "demo_dealer_001": {
                "user_id": "demo_dealer_001",
                "email": "demo.dealer@aegis.gov",
                "name": "Smith Arms Co.",
                "role": "dealer",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            "demo_admin_001": {
                "user_id": "demo_admin_001",
                "email": "admin@aegis.gov",
                "name": "System Administrator",
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        if user_id in demo_data:
            await db.users.insert_one(demo_data[user_id])
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=500, detail="Failed to initialize demo user")
    
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=86400,
        path="/"
    )
    
    return {
        "message": "Login successful",
        "session_token": session_token,
        "user": serialize_doc(user)
    }
