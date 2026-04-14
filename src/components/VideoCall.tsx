import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoCallProps {
  channelName: string;
  role: 'host' | 'audience';
  onEnd: () => void;
}

// @ts-ignore
const APP_ID = (import.meta as any).env.VITE_AGORA_APP_ID || "e66b5e13d30b4844b6f95ad4b9cd7572";

export function VideoCall({ channelName, role, onEnd }: VideoCallProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const localPlayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let agoraClient: IAgoraRTCClient;

    const init = async () => {
      agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setClient(agoraClient);

      agoraClient.on('user-published', async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        if (mediaType === 'video') {
          setRemoteUsers((prev) => [...prev, user]);
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      agoraClient.on('user-unpublished', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      try {
        await agoraClient.join(APP_ID, channelName, null, null);

        // Both host and audience (patient) should publish their tracks for a 2-way call
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        if (localPlayerRef.current) {
          videoTrack.play(localPlayerRef.current);
        }
        
        await agoraClient.publish([audioTrack, videoTrack]);
      } catch (error) {
        console.error("Agora init error:", error);
      }
    };

    init();

    return () => {
      localAudioTrack?.close();
      localVideoTrack?.close();
      agoraClient?.leave();
    };
  }, [channelName, role]);

  const toggleMic = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!micOn);
      setMicOn(!micOn);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!videoOn);
      setVideoOn(!videoOn);
    }
  };

  const handleEndCall = () => {
    localAudioTrack?.stop();
    localAudioTrack?.close();
    localVideoTrack?.stop();
    localVideoTrack?.close();
    client?.leave();
    onEnd();
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-4 transition-all",
      isFullScreen ? "p-0" : "p-4"
    )}>
      <div className="relative w-full max-w-6xl aspect-video bg-slate-800 rounded-[40px] overflow-hidden shadow-2xl border border-slate-700">
        {/* Remote Video (Main) */}
        <div className="w-full h-full flex items-center justify-center">
          {remoteUsers.length > 0 ? (
            remoteUsers.map((user) => (
              <RemotePlayer key={user.uid} user={user} />
            ))
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Video size={40} className="text-slate-500" />
              </div>
              <p className="text-slate-400 font-medium">Waiting for other participant...</p>
            </div>
          )}
        </div>

        {/* Local Video (PIP) */}
        <div 
          ref={localPlayerRef}
          className="absolute bottom-8 right-8 w-48 md:w-64 aspect-video bg-slate-700 rounded-3xl overflow-hidden border-2 border-slate-600 shadow-xl z-10"
        />

        {/* Controls Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl px-8 py-4 rounded-[32px] border border-slate-700/50 shadow-2xl z-20">
          <button 
            onClick={toggleMic}
            className={cn(
              "p-4 rounded-2xl transition-all",
              micOn ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-500 text-white hover:bg-red-600"
            )}
          >
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          
          <button 
            onClick={toggleVideo}
            className={cn(
              "p-4 rounded-2xl transition-all",
              videoOn ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-500 text-white hover:bg-red-600"
            )}
          >
            {videoOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          <button 
            onClick={handleEndCall}
            className="p-4 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
          >
            <PhoneOff size={24} />
          </button>

          <div className="w-px h-8 bg-slate-700 mx-2" />

          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all"
          >
            {isFullScreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>

        {/* Info Overlay */}
        <div className="absolute top-8 left-8 flex items-center gap-3 bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/30">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">Live Consultation</span>
          <span className="text-slate-400 text-xs ml-2">Channel: {channelName}</span>
        </div>
      </div>
    </div>
  );
}

function RemotePlayer({ user }: { user: any; key?: any }) {
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playerRef.current) {
      user.videoTrack?.play(playerRef.current);
    }
  }, [user]);

  return <div ref={playerRef} className="w-full h-full" />;
}
