"""行情接口路由。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.market import (
    FlowItem,
    KlineResponse,
    MarketOverview,
    Quote,
    RankResponse,
    SearchResponse,
)
from app.services import market_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/overview", response_model=MarketOverview, summary="行情总览看板")
def overview() -> MarketOverview:
    """一次性返回指数卡片、涨跌统计与三个榜单，供首页渲染。"""
    try:
        return market_service.get_overview()
    except Exception as exc:  # 数据源异常统一转 502，前端展示重试
        raise HTTPException(status_code=502, detail=f"行情数据获取失败: {exc}") from exc


@router.get("/indices", summary="主要指数行情")
def indices():
    return market_service.get_indices()


@router.get("/rank", response_model=RankResponse, summary="排行榜")
def rank(
    sort_by: str = Query("change_percent", description="排序字段: change_percent/amount/volume/turnover_rate/market_cap"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(20, ge=1, le=100),
) -> RankResponse:
    return market_service.get_rank_response(sort_by=sort_by, order=order, limit=limit)


@router.get("/search", response_model=SearchResponse, summary="搜索股票")
def search(
    keyword: str = Query(..., min_length=1, max_length=20),
    limit: int = Query(10, ge=1, le=50),
) -> SearchResponse:
    return market_service.search(keyword, limit=limit)


@router.get("/quote/{code}", response_model=Quote, summary="单只标的实时行情")
def quote(code: str) -> Quote:
    result = market_service.get_quote(code)
    if result is None:
        raise HTTPException(status_code=404, detail=f"未找到标的: {code}")
    return result


@router.get("/fund-flow", response_model=list[FlowItem], summary="主力资金净流入榜")
def fund_flow(
    order: str = Query("desc", pattern="^(asc|desc)$", description="desc 为净流入榜，asc 为净流出榜"),
    limit: int = Query(20, ge=1, le=50),
) -> list[FlowItem]:
    return market_service.get_fund_flow_rank(order=order, limit=limit)


@router.get("/quotes", response_model=list[Quote], summary="批量行情（自选列表用）")
def quotes(
    codes: str = Query(..., description="逗号分隔的代码，如 sh600519,sz300750"),
) -> list[Quote]:
    parsed = [item.strip() for item in codes.split(",") if item.strip()]
    if not parsed:
        raise HTTPException(status_code=400, detail="codes 不能为空")
    return market_service.get_quotes(parsed)


@router.get("/watchlist/default", response_model=list[str], summary="自选股默认清单")
def watchlist_default() -> list[str]:
    return market_service.get_default_watchlist()


@router.get("/kline/{code}", response_model=KlineResponse, summary="K 线数据")
def kline(
    code: str,
    period: str = Query("day", pattern="^(day|week|month)$"),
    adjust: str = Query("qfq", pattern="^(qfq|hfq|none)$"),
    limit: int = Query(120, ge=1, le=800),
) -> KlineResponse:
    return market_service.get_kline(code, period=period, adjust=adjust, limit=limit)
