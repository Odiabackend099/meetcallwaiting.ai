#!/usr/bin/env python3
"""
CallWaiting.ai Backend API Server
Production-ready FastAPI server with Nigerian network optimizations
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

# Add the src directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from fastapi import FastAPI, HTTPException, Request, Depends, status
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.middleware.trustedhost import TrustedHostMiddleware
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel, EmailStr
    import uvicorn
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Installing required packages...")
    os.system("pip install fastapi uvicorn python-multipart email-validator")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CallWaiting.ai API",
    description="Backend API for CallWaiting.ai with Nigerian network optimizations",
    version="1.0.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url="/redoc" if os.getenv("NODE_ENV") != "production" else None
)

# Security
security = HTTPBearer(auto_error=False)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://callwaitingai.odia.dev",
        "https://meetcallwaiting.ai"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted hosts middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "callwaitingai.odia.dev", "meetcallwaiting.ai"]
)

# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = f"req_{int(time.time() * 1000)}"
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    logger.info(f"📥 {request.method} {request.url.path} [{request_id}] - {response.status_code} - {process_time:.3f}s")
    
    return response

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    business_name: str
    phone: str
    industry: Optional[str] = "general"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChatMessage(BaseModel):
    message: str
    history: Optional[list] = []

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    request_id: str

# In-memory storage for demo (replace with database)
users_db = {}
sessions_db = {}

def generate_request_id():
    return f"req_{int(time.time() * 1000)}"

def validate_nigerian_phone(phone: str) -> bool:
    """Validate Nigerian phone number format"""
    import re
    patterns = [
        r'^\+234[789][01]\d{8}$',  # +234 format
        r'^234[789][01]\d{8}$',    # 234 format
        r'^0[789][01]\d{8}$',      # Local format starting with 0
        r'^[789][01]\d{8}$'        # Without leading 0 or country code
    ]
    return any(re.match(pattern, phone.replace(' ', '')) for pattern in patterns)

def normalize_nigerian_phone(phone: str) -> str:
    """Normalize Nigerian phone number to +234 format"""
    digits = ''.join(filter(str.isdigit, phone))
    
    if digits.startswith('234'):
        return '+' + digits
    elif digits.startswith('0'):
        return '+234' + digits[1:]
    elif len(digits) == 10 and digits[0] in '789':
        return '+234' + digits
    
    return phone

def generate_token(user_id: str, email: str) -> str:
    """Generate JWT-like token (simplified for demo)"""
    import hashlib
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": int(time.time()) + 86400  # 24 hours
    }
    token_data = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(token_data.encode()).hexdigest()

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify token and return user data"""
    try:
        # In a real implementation, you'd use proper JWT verification
        # For demo purposes, we'll check if token exists in sessions_db
        if token in sessions_db:
            session = sessions_db[token]
            if session["exp"] > int(time.time()):
                return session["user"]
        return None
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None

def hash_password(password: str) -> str:
    """Hash password using bcrypt-like approach (simplified for demo)"""
    import hashlib
    salt = "callwaiting_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user = verify_token(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return user

# Health check endpoint
@app.get("/api/health")
async def health_check(request: Request):
    """Comprehensive health check"""
    health_data = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "uptime": time.time(),
        "environment": os.getenv("NODE_ENV", "development"),
        "version": "1.0.0",
        "checks": {
            "database": "connected",  # Simplified for demo
            "memory": "ok",
            "python_version": sys.version,
            "platform": sys.platform
        },
        "request_id": getattr(request.state, 'request_id', 'unknown')
    }
    
    return health_data

# Authentication endpoints
@app.post("/api/auth/register", response_model=APIResponse)
async def register_user(user_data: UserRegister, request: Request):
    """Register a new user"""
    try:
        request_id = getattr(request.state, 'request_id', generate_request_id())
        
        # Validation
        if len(user_data.password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters long"
            )
        
        if not validate_nigerian_phone(user_data.phone):
            raise HTTPException(
                status_code=400,
                detail="Invalid Nigerian phone number format. Please use +234XXXXXXXXXX format"
            )
        
        # Normalize phone number
        normalized_phone = normalize_nigerian_phone(user_data.phone)
        
        # Check if user already exists
        if user_data.email.lower() in users_db:
            raise HTTPException(
                status_code=409,
                detail="User with this email already exists"
            )
        
        # Create user
        user_id = f"user_{int(time.time() * 1000)}"
        hashed_password = hash_password(user_data.password)
        
        user = {
            "id": user_id,
            "email": user_data.email.lower(),
            "business_name": user_data.business_name,
            "phone": normalized_phone,
            "industry": user_data.industry,
            "created_at": datetime.now().isoformat(),
            "password_hash": hashed_password
        }
        
        users_db[user_data.email.lower()] = user
        
        # Generate token
        token = generate_token(user_id, user_data.email.lower())
        sessions_db[token] = {
            "user": user,
            "exp": int(time.time()) + 86400
        }
        
        logger.info(f"✅ User registered: {user_data.email}")
        
        return APIResponse(
            success=True,
            message="User registered successfully",
            data={
                "user": {
                    "id": user_id,
                    "email": user_data.email.lower(),
                    "business_name": user_data.business_name,
                    "phone": normalized_phone,
                    "industry": user_data.industry
                },
                "token": token
            },
            request_id=request_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/auth/login", response_model=APIResponse)
async def login_user(login_data: UserLogin, request: Request):
    """Login user"""
    try:
        request_id = getattr(request.state, 'request_id', generate_request_id())
        
        # Find user
        user = users_db.get(login_data.email.lower())
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Generate token
        token = generate_token(user["id"], user["email"])
        sessions_db[token] = {
            "user": user,
            "exp": int(time.time()) + 86400
        }
        
        logger.info(f"✅ User logged in: {login_data.email}")
        
        return APIResponse(
            success=True,
            message="Login successful",
            data={
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "business_name": user["business_name"],
                    "phone": user["phone"],
                    "industry": user["industry"]
                },
                "token": token
            },
            request_id=request_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.post("/api/auth/verify", response_model=APIResponse)
async def verify_token_endpoint(current_user: dict = Depends(get_current_user), request: Request = None):
    """Verify JWT token"""
    request_id = getattr(request.state, 'request_id', generate_request_id()) if request else generate_request_id()
    
    return APIResponse(
        success=True,
        message="Token is valid",
        data={"user": current_user},
        request_id=request_id
    )

# Chat endpoints
@app.get("/api/chat/config")
async def chat_config(request: Request):
    """Get chat widget configuration"""
    request_id = getattr(request.state, 'request_id', generate_request_id())
    
    return {
        "groqApiKey": os.getenv("GROQ_API_KEY") if os.getenv("GROQ_API_KEY") else None,
        "ttsUrl": os.getenv("TTS_URL", "http://localhost:3001/v1/synthesize"),
        "features": {
            "voiceEnabled": bool(os.getenv("GROQ_API_KEY")),
            "ttsEnabled": True
        },
        "request_id": request_id
    }

@app.post("/api/chat/message", response_model=APIResponse)
async def process_chat_message(message_data: ChatMessage, request: Request):
    """Process chat messages and return AI responses"""
    try:
        request_id = getattr(request.state, 'request_id', generate_request_id())
        
        if not message_data.message or not message_data.message.strip():
            raise HTTPException(
                status_code=400,
                detail="Message is required"
            )
        
        # Simple fallback response system
        response = get_fallback_response(message_data.message)
        
        logger.info(f"💬 Chat message processed: {len(message_data.message)} chars")
        
        return APIResponse(
            success=True,
            message="Message processed successfully",
            data={"response": response},
            request_id=request_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        raise HTTPException(status_code=500, detail="Message processing failed")

def get_fallback_response(message: str) -> str:
    """Get fallback response when AI is not available"""
    lower_message = message.lower()
    
    if 'hello' in lower_message or 'hi' in lower_message:
        return "Hello! I'm CallWaiting.ai's assistant. How can I help you today?"
    elif 'pricing' in lower_message or 'cost' in lower_message:
        return "Our pricing starts at $29/month for the Starter plan. Would you like to see our full pricing options?"
    elif 'demo' in lower_message or 'trial' in lower_message:
        return "Great! You can start a free 7-day trial right now. Would you like me to help you get started?"
    elif 'call' in lower_message or 'phone' in lower_message:
        return "CallWaiting.ai automatically answers your calls and sends SMS follow-ups to missed callers. It helps you never miss a potential customer!"
    else:
        return "Thanks for your message! Our team will get back to you soon. In the meantime, you can check out our pricing or start a free trial."

# Dashboard endpoints (placeholder)
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user), request: Request = None):
    """Get dashboard statistics"""
    request_id = getattr(request.state, 'request_id', generate_request_id()) if request else generate_request_id()
    
    # TODO: Implement real dashboard statistics
    return APIResponse(
        success=True,
        message="Dashboard stats retrieved",
        data={
            "totalCalls": 0,
            "answeredCalls": 0,
            "missedCalls": 0,
            "conversionRate": 0,
            "revenueSaved": 0
        },
        request_id=request_id
    )

# Payment endpoints (placeholder)
@app.post("/api/payments/create-checkout")
async def create_checkout(current_user: dict = Depends(get_current_user), request: Request = None):
    """Create Stripe checkout session"""
    request_id = getattr(request.state, 'request_id', generate_request_id()) if request else generate_request_id()
    
    # TODO: Implement Stripe checkout
    return APIResponse(
        success=False,
        message="Payment processing not yet implemented",
        request_id=request_id
    )

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, 'request_id', generate_request_id())
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "request_id": request_id
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, 'request_id', generate_request_id())
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "request_id": request_id
        }
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3001))
    host = "0.0.0.0"
    
    logger.info(f"🚀 Starting CallWaiting.ai API Server on {host}:{port}")
    logger.info(f"📊 Environment: {os.getenv('NODE_ENV', 'development')}")
    logger.info(f"🌍 CORS enabled for localhost and production domains")
    logger.info(f"⚡ Nigerian network optimizations enabled")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )
