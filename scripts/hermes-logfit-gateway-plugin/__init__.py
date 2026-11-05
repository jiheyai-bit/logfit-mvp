import asyncio
import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# Set LOGFIT_PROJECT_ROOT when the plugin is copied into the Hermes plugins folder.
PROJECT_ROOT = Path(os.environ.get('LOGFIT_PROJECT_ROOT') or Path(__file__).resolve().parents[2])
RESPONSE = PROJECT_ROOT / 'scripts' / 'logfit-response-cli.js'
ROUTER = PROJECT_ROOT / 'scripts' / 'logfit-telegram-router.js'
PLAN_REQUEST = PROJECT_ROOT / 'scripts' / 'logfit-plan-request.js'
EVENT_WRITER = PROJECT_ROOT / 'scripts' / 'logfit-telegram-event.js'


def _node(path: Path, payload: dict, timeout: int = 10) -> dict:
    result = subprocess.run(
        ['node', str(path), json.dumps(payload, ensure_ascii=False)],
        cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=timeout, check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-500:] or f'{path.name} exited {result.returncode}')
    return json.loads(result.stdout or '{}')


def _write_event(result: dict, message: str, inbound_id: str | None = None, chat_id: str | None = None) -> None:
    now = datetime.now(ZoneInfo('Asia/Seoul')).isoformat()
    decision = {
        'at': now,
        'decision': result.get('kind'),
        'inputs': {'channel': 'telegram', 'text': message},
        'reason': result.get('reason') or ('planning_request' if result.get('kind') == 'request' else None),
        'tools': [step.get('step') for step in result.get('steps', [])] or (
            ['classifyInput', 'parseLogFitSentence'] if result.get('kind') == 'record' else ['classifyInput']
        ),
        'status': 'waiting' if result.get('status', '').startswith('awaiting_') else 'proposed',
    }
    _node(EVENT_WRITER, {
        'event_id': f'decision-{inbound_id}' if inbound_id else None,
        'schedule_id': 'telegram-inbox',
        'event_type': 'decision_log',
        'metadata': {
            'decision_log': decision,
            'chat_id': chat_id,
            'kind': result.get('kind'),
            'status': result.get('status'),
            'message': result.get('message'),
            'records': result.get('records', []),
            'body_stats': result.get('body_stats'),
            'plan': result.get('plan'),
            'suggestion': result.get('suggestion'),
            'steps': result.get('steps', []),
        },
    })


async def _send(gateway, event, text: str) -> None:
    adapter = gateway._delivery_adapter_for(event.source)
    if adapter is None:
        raise RuntimeError('no delivery adapter for inbound Telegram source')
    await adapter.send(event.source.chat_id, text)


def _inbound_event_id(event) -> str | None:
    source = getattr(event, 'source', None)
    for value in (
        getattr(event, 'event_id', None),
        getattr(event, 'message_id', None),
        getattr(event, 'update_id', None),
        getattr(source, 'message_id', None),
        getattr(source, 'update_id', None),
    ):
        if value is not None and str(value).strip():
            return str(value)
    return None


async def _pre_gateway_dispatch(*, event, gateway, **_kwargs):
    source = getattr(event, 'source', None)
    platform = getattr(getattr(source, 'platform', None), 'value', getattr(source, 'platform', None))
    if platform != 'telegram':
        return None
    message = getattr(event, 'text', '')
    if not isinstance(message, str) or not message.strip():
        return None
    try:
        inbound_id = _inbound_event_id(event)
        chat_id = str(getattr(source, 'chat_id', '') or '') or None
        if inbound_id:
            if _node(EVENT_WRITER, {'check_only': True, 'event_id': inbound_id}).get('processed'):
                print('[logfit-gateway] duplicate inbound event skipped [logfit-handled]', flush=True)
                return {'action': 'skip', 'reason': 'logfit_duplicate_event'}
            _node(EVENT_WRITER, {
                'event_id': inbound_id,
                'schedule_id': 'telegram-inbox',
                'event_type': 'telegram_message',
                'metadata': {'message_id': inbound_id, 'chat_id': chat_id, 'text': message[:1000]},
            })
        response = _node(RESPONSE, {'text': message, 'chat_id': chat_id}, timeout=5)
        if response.get('status') != 'no_pending':
            if response.get('message'):
                await _send(gateway, event, response['message'])
            print(f'[logfit-gateway] handled status={response.get("status")} [logfit-handled]', flush=True)
            return {'action': 'skip', 'reason': 'logfit_pending_response'}

        result = _node(ROUTER, {'text': message}, timeout=5)
        if result.get('kind') == 'other':
            return None
        if result.get('kind') == 'request':
            result = _node(PLAN_REQUEST, {'text': message}, timeout=15)
        _write_event(result, message, inbound_id, chat_id)
        if result.get('message'):
            await _send(gateway, event, result['message'])
        print(f'[logfit-gateway] handled kind={result.get("kind")} [logfit-handled]', flush=True)
        return {'action': 'skip', 'reason': 'logfit_input'}
    except Exception as error:
        print(f'[logfit-gateway] failed: {error}', flush=True)
        return None


def register(ctx):
    ctx.register_hook('pre_gateway_dispatch', _pre_gateway_dispatch)
    print('[logfit-gateway] pre_gateway_dispatch registered', flush=True)
