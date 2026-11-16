from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

JobStatus = Literal["Applied", "Interview", "Offer", "Rejected", "Wishlist"]


class JobApplicationBase(BaseModel):
    company: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=120)
    status: JobStatus = "Applied"
    location: str | None = None
    job_type: str | None = None
    salary_range: str | None = None
    applied_date: date = Field(default_factory=date.today)
    job_url: str | None = None
    notes: str | None = None


class JobApplicationCreate(JobApplicationBase):
    pass


class JobApplicationUpdate(JobApplicationBase):
    pass


class JobApplicationResponse(JobApplicationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
