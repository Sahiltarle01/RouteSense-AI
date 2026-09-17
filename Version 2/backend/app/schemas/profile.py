import re

from pydantic import BaseModel, Field, field_validator, model_validator


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone_number: str | None = Field(default=None, min_length=7, max_length=20)
    current_password: str | None = None
    new_password: str | None = None

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("New password must contain at least one letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("New password must contain at least one number")
        return v

    @model_validator(mode="after")
    def require_current_password_for_change(self):
        if self.new_password and not self.current_password:
            raise ValueError("current_password is required to set a new password")
        return self
