import os
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import JobApplication
from .schemas import JobApplicationCreate, JobApplicationResponse, JobApplicationUpdate

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="Job Tracker API",
    description="REST API for tracking job applications and interview progress.",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Job Tracker API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/applications", response_model=list[JobApplicationResponse])
def list_applications(
    search: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    query = select(JobApplication).order_by(JobApplication.applied_date.desc(), JobApplication.id.desc())
    if search:
        term = f"%{search.strip()}%"
        query = query.where((JobApplication.company.ilike(term)) | (JobApplication.role.ilike(term)))
    if status_filter:
        query = query.where(JobApplication.status == status_filter)
    return db.scalars(query).all()

@app.post("/api/applications", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(payload: JobApplicationCreate, db: Session = Depends(get_db)):
    application = JobApplication(**payload.model_dump())
    db.add(application)
    db.commit()
    db.refresh(application)
    return application

@app.put("/api/applications/{application_id}", response_model=JobApplicationResponse)
def update_application(application_id: int, payload: JobApplicationUpdate, db: Session = Depends(get_db)):
    application = db.get(JobApplication, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    for field, value in payload.model_dump().items():
        setattr(application, field, value)
    db.commit()
    db.refresh(application)
    return application

@app.delete("/api/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: int, db: Session = Depends(get_db)):
    application = db.get(JobApplication, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(application)
    db.commit()

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(JobApplication)) or 0
    rows = db.execute(select(JobApplication.status, func.count()).group_by(JobApplication.status)).all()
    by_status = {name: count for name, count in rows}
    return {
        "total": total,
        "applied": by_status.get("Applied", 0),
        "interviews": by_status.get("Interview", 0),
        "offers": by_status.get("Offer", 0),
        "rejected": by_status.get("Rejected", 0),
    }
