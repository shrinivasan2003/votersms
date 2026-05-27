from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class VoterCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    precinct_id: int
    status: Optional[str] = "Active"

class VoterUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    precinct_id: Optional[int] = None
    status: Optional[str] = None

class CountyCreate(BaseModel):
    code: str
    name: str
    state: Optional[str] = "GA"
    status: Optional[str] = "Active"

class CountyUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None

class PrecinctCreate(BaseModel):
    code: str
    name: str
    county_id: int
    zipcode: Optional[str] = None

class PrecinctUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    county_id: Optional[int] = None
    zipcode: Optional[str] = None

class TemplateCreate(BaseModel):
    code: str
    name: str
    body: str
    status: Optional[str] = "Active"

class JobCreate(BaseModel):
    precinct_id: int
    template_id: int
    provider_id: str
    scheduled_at: Optional[str] = None
    status: Optional[str] = "Pending"

class ProviderCreate(BaseModel):
    code: str
    name: str
    type: Optional[str] = None
    priority: Optional[int] = None
    account_sid: Optional[str] = None
    auth_token: Optional[str] = None
    from_number: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    config_email: Optional[str] = None
    status: Optional[str] = "Active"

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "User"
    status: Optional[str] = "Active"
    customer_id: Optional[int] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = "User"
    status: Optional[str] = "Active"
    customer_id: Optional[int] = None
    last_login: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


class CustomerCreate(BaseModel):
    organization_name: str
    first_name: str
    last_name: str
    email: str
    username: str
    password: str


class CustomerOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    status: Optional[str] = "Active"

    model_config = {
        "from_attributes": True
    }


class RoleCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    status: Optional[str] = "Active"

class RoleUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class PermissionCreate(BaseModel):
    name: str
    code: str
    resource_path: Optional[str] = None
    resource_type: Optional[str] = None
    parent_menu: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = 0
    description: Optional[str] = None
    status: Optional[str] = "Active"
    roleIds: Optional[List[int]] = None

class PermissionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    resource_path: Optional[str] = None
    resource_type: Optional[str] = None
    parent_menu: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None
    roleIds: Optional[List[int]] = None
