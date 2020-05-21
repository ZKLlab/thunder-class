import random

import socketio
from sanic import Sanic

sio = socketio.AsyncServer(async_mode='sanic', cors_allowed_origins='*')
app = Sanic(name='thunder-class')
app.config['CORS_SUPPORTS_CREDENTIALS'] = True
sio.attach(app)

rooms = {}


def generate_room_id():
    while True:
        room_id = str(random.randint(0, 9999999999)).zfill(10)
        if room_id not in rooms:
            return room_id


@sio.event
def connect(sid, _):
    print('connect', sid)


@sio.event
async def join(sid, data):
    room_id = data.get('roomId', None)
    if room_id is None:
        room_id = generate_room_id()
    elif room_id not in rooms:
        await sio.emit('join_reject', room=sid)
        return
    sio.enter_room(sid, room_id)
    if room_id not in rooms:
        rooms[room_id] = {
            'members': {},
            'videos': {},
            'screen': None,
        }
    rooms[room_id]['members'][sid] = data['nickName']
    await sio.save_session(sid, {
        'room_id': room_id,
        'nick_name': data['nickName'],
    })
    await sio.emit('join', {
        'roomId': room_id,
        'members': rooms[room_id]['members'],
        'screen': rooms[room_id]['screen'],
        'sid': sid,
    }, room=room_id)
    await sio.emit('video', rooms[room_id]['videos'], room=room_id)


@sio.event
async def end_audio(sid):
    session = await sio.get_session(sid)
    if 'room_id' in session:
        room_id = session['room_id']
        print('end_audio', sid)
        await sio.emit('end_audio', {'sid': sid}, room=room_id)


@sio.event
async def start_video(sid, data):
    session = await sio.get_session(sid)
    if 'room_id' in session:
        room_id = session['room_id']
        print('start_video', sid, data)
        rooms[room_id]['videos'][sid] = data['character']
        await sio.emit('video', rooms[room_id]['videos'], room=room_id)


@sio.event
async def end_video(sid):
    session = await sio.get_session(sid)
    if 'room_id' in session:
        room_id = session['room_id']
        print('end_video', sid)
        try:
            del rooms[room_id]['videos'][sid]
        except KeyError:
            pass
        await sio.emit('video', rooms[room_id]['videos'], room=room_id)


@sio.event
async def facing_preview(sid, data):
    from face_pose import get_pose
    print('facing_preview', sid, data)
    await sio.emit('facing_preview', get_pose(
        data['points'], data['width'], data['height'], data['faceSize']), room=sid)


@sio.event
async def facing(sid, data):
    from face_pose import get_pose
    session = await sio.get_session(sid)
    if 'room_id' in session:
        room_id = session['room_id']
        if sid in rooms[room_id]['videos']:
            print('facing', sid, data)
            if 'points' in data and 'width' in data and 'height' in data:
                result = get_pose(data['points'], data['width'], data['height'])
                result['active'] = True
            else:
                result = {
                    'pose': {'x': 0, 'y': 0},
                    'poseAlt': {'x': 0, 'y': 0},
                    'active': False,
                }
            result['sid'] = sid
            await sio.emit('facing', result, room=room_id)


@sio.event
async def start_screen_sharing(sid):
    session = await sio.get_session(sid)
    if 'room_id' in session:
        room_id = session['room_id']
        if rooms[room_id]['screen'] is None:
            print('start_screen_sharing', sid)
            rooms[room_id]['screen'] = sid
            await sio.emit('screen', {
                'sid': sid,
            }, room=room_id)


@sio.event
async def stop_screen_sharing(sid):
    session = await sio.get_session(sid)
    if 'room_id' in session:
        room_id = session['room_id']
        if rooms[room_id]['screen'] == sid:
            print('stop_screen_sharing', sid)
            rooms[room_id]['screen'] = None
            await sio.emit('screen', {
                'sid': None,
            }, room=room_id)


@sio.event
async def ice_candidate(sid, data):
    print('ice_candidate', sid, data)
    data['sid'] = sid
    await sio.emit('ice_candidate', data, room=data['to'])


@sio.event
async def offer(sid, data):
    print('offer', sid, data)
    data['sid'] = sid
    await sio.emit('offer', data, room=data['to'])


@sio.event
async def answer(sid, data):
    print('answer', sid, data)
    data['sid'] = sid
    await sio.emit('answer', data, room=data['to'])


@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    if 'room_id' in session:
        room_id = session['room_id']
        if room_id in rooms:
            try:
                del rooms[room_id]['members'][sid]
            except KeyError:
                pass
            try:
                del rooms[room_id]['videos'][sid]
            except KeyError:
                pass
        await sio.emit('leave', {
            'who': session.get('nick_name'),
            'members': rooms[room_id]['members'],
        }, room=room_id)
        await sio.emit('video', rooms[room_id]['videos'], room=room_id)
        if len(rooms[room_id]['members']) == 0:
            try:
                del rooms[room_id]
            except KeyError:
                pass
        sio.leave_room(sid, room_id)
    await sio.save_session(sid, {})
    print('disconnect', sid)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
