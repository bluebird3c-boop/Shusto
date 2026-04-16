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
  const [isConnected, setIsConnected] = useState(false);

  const localPlayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let agoraClient: IAgoraRTCClient;

    const init = async () => {
      try {
        agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        agoraClient.on('user-published', async (user, mediaType) => {
          console.log(`[Agora] User ${user.uid} published ${mediaType}`);
          
          const subscribeWithRetry = async (retries = 3) => {
            try {
              await agoraClient.subscribe(user, mediaType);
              console.log(`[Agora] Successfully subscribed to ${user.uid} ${mediaType}`);
              
              if (mediaType === 'video') {
                setRemoteUsers((prev) => {
                  const exists = prev.find(u => u.uid === user.uid);
                  if (exists) {
                    return prev.map(u => u.uid === user.uid ? { ...user } : u);
                  }
                  return [...prev, { ...user }];
                });
              }
              if (mediaType === 'audio') {
                user.audioTrack?.play();
              }
            } catch (e) {
              if (retries > 0) {
                console.warn(`[Agora] Subscription failed, retrying... (${retries} left)`);
                setTimeout(() => subscribeWithRetry(retries - 1), 1000);
              } else {
                console.error("[Agora] Subscription error after retries:", e);
              }
            }
          };

          subscribeWithRetry();
        });

        agoraClient.on('user-unpublished', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        await agoraClient.join(APP_ID, channelName, null, Math.floor(Math.random() * 1000000));

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack().catch(e => {
          console.error("Mic error:", e);
          return null;
        });
        const videoTrack = await AgoraRTC.createCameraVideoTrack().catch(e => {
          console.error("Camera error:", e);
          return null;
        });
        
        if (audioTrack) setLocalAudioTrack(audioTrack);
        if (videoTrack) setLocalVideoTrack(videoTrack);
        
        const tracksToPublish = [];
        if (audioTrack) tracksToPublish.push(audioTrack);
        if (videoTrack) tracksToPublish.push(videoTrack);

        if (tracksToPublish.length > 0) {
          await agoraClient.publish(tracksToPublish);
        }
        setIsConnected(true);
      } catch (error) {
        console.error("Agora init error:", error);
      }
    };

    init();

    return () => {
      localAudioTrack?.stop();
      localAudioTrack?.close();
      localVideoTrack?.stop();
      localVideoTrack?.close();
      agoraClient?.leave();
    };
  }, [channelName]);

  // Handle local video playback
  useEffect(() => {
    if (localVideoTrack && localPlayerRef.current) {
      localVideoTrack.play(localPlayerRef.current, { fit: 'cover' });
    }
    return () => {
      localVideoTrack?.stop();
    };
  }, [localVideoTrack, localPlayerRef.current]);

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

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
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="relative w-full h-full bg-black overflow-hidden">
        {/* Remote Video (Main - Background) */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          {remoteUsers.length > 0 ? (
            remoteUsers.map((user) => (
              <RemotePlayer key={user.uid} user={user} />
            ))
          ) : (
            <div className="text-center space-y-6 z-10 px-6">
              <div className="w-24 h-24 bg-slate-800/50 backdrop-blur-md rounded-full flex items-center justify-center mx-auto animate-pulse border border-white/10">
                <Video size={48} className="text-slate-500" />
              </div>
              <div className="space-y-2">
                <p className="text-white text-lg font-semibold">কানেক্ট হচ্ছে...</p>
                <p className="text-slate-400 text-sm">আপনার ডাক্তার বা রোগীর জন্য অপেক্ষা করা হচ্ছে। অনুগ্রহ করে লাইন কাটবেন না।</p>
              </div>
              <div className="inline-block px-4 py-2 bg-white/5 rounded-lg border border-white/5">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-mono">Channel ID: {channelName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PIP - Floating) */}
        <div 
          ref={localPlayerRef}
          className="absolute top-6 right-6 w-32 md:w-48 aspect-[9/16] md:aspect-video bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-30 transition-all cursor-move"
        />

        {/* Top Info Overlay */}
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-40">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
          <span className="text-white text-xs font-medium uppercase tracking-wider">লাইভ</span>
        </div>

        {/* Controls Overlay (Bottom) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/60 backdrop-blur-2xl px-8 py-5 rounded-[40px] border border-white/10 shadow-2xl z-50">
          <button 
            onClick={toggleMic}
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all",
              micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"
            )}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          <button 
            onClick={toggleVideo}
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-full transition-all",
              videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"
            )}
          >
            {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button 
            onClick={handleEndCall}
            className="w-14 h-14 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-xl shadow-red-500/40"
          >
            <PhoneOff size={24} />
          </button>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <button 
            onClick={toggleFullScreen}
            className="w-12 h-12 flex items-center justify-center bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
          >
            {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function RemotePlayer({ user }: { user: any }) {
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playerRef.current && user.videoTrack) {
      user.videoTrack.play(playerRef.current, { fit: 'cover' });
    }
    return () => {
      user.videoTrack?.stop();
    };
  }, [user.videoTrack, playerRef.current]);

  return <div ref={playerRef} className="w-full h-full" />;
}
