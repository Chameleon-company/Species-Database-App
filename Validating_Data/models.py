# models.py
from pydantic import BaseModel, Field, HttpUrl, model_validator
from typing import Optional, List
from uuid import UUID

class VideoItem(BaseModel):
    type: str
    url: HttpUrl
    language: Optional[str] = Field(
        None, description="Video language", pattern="^(en|tet)$"
    )

class SpeciesRecord(BaseModel):
    id: UUID
    sr_no: int
    language: str
    scientific_name: str
    common_name: str
    etymology: Optional[str] = None
    habitat: Optional[str] = None
    phenology: Optional[str] = None
    identification_characters: Optional[str] = None
    leaf_type: str
    fruit_type: str
    seed_germination: Optional[str] = None
    pest: Optional[str] = None
    image_urls: Optional[List[HttpUrl]] = Field(default_factory=list)
    videos: Optional[List[VideoItem]] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_media_urls(self):
        if not isinstance(self.image_urls, list):
            object.__setattr__(self, "image_urls", [])
        if not isinstance(self.videos, list):
            object.__setattr__(self, "videos", [])

        validated_videos = []
        for idx, vid in enumerate(self.videos):
            if isinstance(vid, dict):
                validated_videos.append(VideoItem(**vid))
            elif isinstance(vid, VideoItem):
                validated_videos.append(vid)
            else:
                raise ValueError(f"videos[{idx}] must be a VideoItem or dict")
        object.__setattr__(self, "videos", validated_videos)

        return self
