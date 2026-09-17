import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def _validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must contain at least one letter")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one number")
    return password


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone_number: str = Field(min_length=7, max_length=20)
    password: str
    confirm_password: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits_only = re.sub(r"[^\d]", "", v)
        if len(digits_only) < 7:
            raise ValueError("Enter a valid phone number")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)

    @model_validator(mode="after")
    def validate_confirmation(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and confirmation do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class UserOut(BaseModel):
    """
    Deliberately excludes password_hash -- this is what the API is allowed
    to return, never the ORM object directly.
    """
    id: int
    full_name: str
    email: EmailStr
    phone_number: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
