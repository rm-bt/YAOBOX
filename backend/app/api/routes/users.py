from fastapi import APIRouter, Depends

from app.api.routes.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserMeResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "language_pref": getattr(current_user, "language_pref", None),
        "created_at": current_user.created_at,
    }