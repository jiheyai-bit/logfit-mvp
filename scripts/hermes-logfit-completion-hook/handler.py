import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PARSER = PROJECT_ROOT / 'scripts' / 'logfit-completion.js'
ROUTER = PROJECT_ROOT / 'scripts' / 'logfit-telegram-router.js'
RESPONSE = PROJECT_ROOT / 'scripts' / 'logfit-response-cli.js'
PLAN_REQUEST = PROJECT_ROOT / 'scripts' / 'logfit-plan-request.js'
EVENT_WRITER = PROJECT_ROOT / 'scripts' / 'logfit-telegram-event.js'
SCHEDULE_ID = 'routine-hangang-5km-fasted'
WEATHER_SCHEDULE_ID = 'routine-hangang-5km-weather'


def inbound_event_id(context: dict):
    for key in ('event_id', 'message_id', 'update_id'):
        value = context.get(key)
        if value is not None and str(value).strip():
            return str(value)
    return None


def handle(event_type: str, context: dict):
    if event_type != 'agent:start' or context.get('platform') != 'telegram':
        return
    message = context.get('message', '')
    if not isinstance(message, str) or not message.strip():
        return
    chat_id = str(context.get('chat_id') or '') or None
    try:
        event_id = inbound_event_id(context)
        if event_id:
            duplicate_check = subprocess.run(
                ['node', str(EVENT_WRITER), json.dumps({'check_only': True, 'event_id': event_id})],
                cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=5, check=False,
            )
            if duplicate_check.returncode == 0 and json.loads(duplicate_check.stdout or '{}').get('processed'):
                print('[logfit-response] duplicate inbound event skipped')
                return
            subprocess.run(
                ['node', str(EVENT_WRITER), json.dumps({
                    'event_id': event_id,
                    'schedule_id': 'telegram-inbox',
                    'event_type': 'telegram_message',
                    'metadata': {'message_id': event_id, 'chat_id': chat_id, 'text': message[:1000]},
                }, ensure_ascii=False)],
                cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=5, check=False,
            )
        response_result = subprocess.run(
            ['node', str(RESPONSE), json.dumps({'text': message, 'chat_id': chat_id}, ensure_ascii=False)],
            cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=5, check=False,
        )
        if response_result.returncode == 0:
            response = json.loads(response_result.stdout or '{}')
            if response.get('status') != 'no_pending':
                print(f"[logfit-response] status={response.get('status')}")
                if response.get('message'):
                    print(response['message'])
                return
    except Exception as error:
        print(f'[logfit-response] hook error: {error}')
    try:
        routed = subprocess.run(
            ['node', str(ROUTER), json.dumps({'text': message}, ensure_ascii=False)],
            cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=5, check=False,
        )
        if routed.returncode != 0:
            print(f'[logfit-router] failed: {routed.stderr[-300:]}')
            return
        result = json.loads(routed.stdout or '{}')
        if result.get('kind') == 'other':
            return
        if result.get('kind') == 'request':
            planned = subprocess.run(
                ['node', str(PLAN_REQUEST), json.dumps({'text': message}, ensure_ascii=False)],
                cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=15, check=False,
            )
            if planned.returncode == 0:
                result = json.loads(planned.stdout or '{}')
            else:
                print(f'[logfit-plan] fallback: {planned.stderr[-300:]}')
        now = datetime.now(ZoneInfo('Asia/Seoul')).isoformat()
        decision = {
            'at': now,
            'decision': result.get('kind'),
            'inputs': {'channel': 'telegram', 'text': message},
            'reason': result.get('reason') or ('planning_request' if result.get('kind') == 'request' else None),
            'tools': [step.get('step') for step in result.get('steps', [])] or (['classifyInput', 'parseLogFitSentence'] if result.get('kind') == 'record' else ['classifyInput']),
            'status': 'waiting' if result.get('status', '').startswith('awaiting_') else 'proposed',
        }
        subprocess.run(
            ['node', str(EVENT_WRITER), json.dumps({
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
            }, ensure_ascii=False)],
            cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=5, check=False,
        )
        print(f"[logfit-router] kind={result.get('kind')} status={result.get('status')}")
        if result.get('message'):
            print(result['message'])
    except Exception as error:
        print(f'[logfit-router] hook error: {error}')
