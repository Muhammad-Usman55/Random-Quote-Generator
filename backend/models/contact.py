from pydantic import BaseModel, EmailStr, field_validator


class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

    @field_validator("name")
    @classmethod
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters.")
        return v.strip()

    @field_validator("subject")
    @classmethod
    def subject_min_length(cls, v: str) -> str:
        if len(v.strip()) < 3:
            raise ValueError("Subject must be at least 3 characters.")
        return v.strip()

    @field_validator("message")
    @classmethod
    def message_min_length(cls, v: str) -> str:
        if len(v.strip()) < 20:
            raise ValueError("Message must be at least 20 characters.")
        return v.strip()


class ContactResponse(BaseModel):
    success: bool
    message: str
