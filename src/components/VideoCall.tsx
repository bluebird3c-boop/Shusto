import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize, AlertCircle, Camera, ShieldAlert } from 'lucide-react';
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
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const [permissionError, setPermissionError] = useState<{
    type: 'camera' | 'microphone' | 'both' | 'general';
    message: string;
  } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const localPlayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const remoteUsersRef = useRef<Map<string, any>>(new Map());

  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  useEffect(() => {
    let agoraClient: IAgoraRTCClient;

    const init = async () => {
      setIsInitializing(true);
      setPermissionError(null);
      setDebugInfo(`Joining channel: ${channelName}...`);
      
      try {
        agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        agoraClient.on('user-joined', (user) => {
          console.log("Remote user joined:", user.uid);
          remoteUsersRef.current.set(user.uid.toString(), { 
            uid: user.uid, 
            videoTrack: user.videoTrack, 
            audioTrack: user.audioTrack 
          });
          setRemoteUsers(Array.from(remoteUsersRef.current.values()));
          setDebugInfo(`User ${user.uid} joined.`);
        });

        agoraClient.on('user-left', (user) => {
          console.log("Remote user left:", user.uid);
          remoteUsersRef.current.delete(user.uid.toString());
          setRemoteUsers(Array.from(remoteUsersRef.current.values()));
          setDebugInfo(`User ${user.uid} left.`);
        });

        agoraClient.on('user-published', async (user, mediaType) => {
          try {
            await agoraClient.subscribe(user, mediaType);
            console.log("Subscribed to", user.uid, mediaType);
            
            const existing = remoteUsersRef.current.get(user.uid.toString()) || { uid: user.uid };
            remoteUsersRef.current.set(user.uid.toString(), {
              ...existing,
              videoTrack: mediaType === 'video' ? user.videoTrack : existing.videoTrack,
              audioTrack: mediaType === 'audio' ? user.audioTrack : existing.audioTrack
            });
            
            setRemoteUsers(Array.from(remoteUsersRef.current.values()));

            if (mediaType === 'audio') {
              user.audioTrack?.play();
            }
          } catch (e) {
            console.error("Subscribe error:", e);
            setDebugInfo(`Sub error: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        });

        agoraClient.on('user-unpublished', (user, mediaType) => {
          const existing = remoteUsersRef.current.get(user.uid.toString());
          if (existing) {
            remoteUsersRef.current.set(user.uid.toString(), {
              ...existing,
              videoTrack: mediaType === 'video' ? undefined : existing.videoTrack,
              audioTrack: mediaType === 'audio' ? undefined : existing.audioTrack
            });
            setRemoteUsers(Array.from(remoteUsersRef.current.values()));
          }
        });

        // Join the channel
        const uid = await agoraClient.join(APP_ID, channelName, null, null);
        console.log("Joined channel as UID:", uid);
        setDebugInfo(`Connected as ${uid}. Waiting for others...`);

        // Create tracks
        let audioTrack: IMicrophoneAudioTrack | null = null;
        let videoTrack: ICameraVideoTrack | null = null;

        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          setLocalAudioTrack(audioTrack);
          localAudioTrackRef.current = audioTrack;
        } catch (e: any) {
          console.error("Mic error:", e);
          if (e.code === 'PERMISSION_DENIED') {
            setPermissionError({ type: 'microphone', message: 'মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি।' });
          }
        }

        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "720p_1",
          });
          setLocalVideoTrack(videoTrack);
          localVideoTrackRef.current = videoTrack;
        } catch (e: any) {
          console.error("Camera error:", e);
          if (e.code === 'PERMISSION_DENIED') {
            setPermissionError(prev => ({
              type: prev?.type === 'microphone' ? 'both' : 'camera',
              message: prev?.type === 'microphone' ? 'ক্যামেরা এবং মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি।' : 'ক্যামেরা ব্যবহারের অনুমতি পাওয়া যায়নি।'
            }));
          }
        }
        
        const tracksToPublish = [];
        if (audioTrack) tracksToPublish.push(audioTrack);
        if (videoTrack) tracksToPublish.push(videoTrack);

        if (tracksToPublish.length > 0) {
          await agoraClient.publish(tracksToPublish);
        }
        
        setIsConnected(true);
      } catch (error: any) {
        console.error("Agora init error:", error);
        setPermissionError({ type: 'general', message: `ভিডিও কল শুরু করতে সমস্যা হচ্ছে। (${error.message || 'Unknown'})` });
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      localAudioTrackRef.current?.stop();
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.stop();
      localVideoTrackRef.current?.close();
      agoraClient?.leave();
    };
  }, [channelName]);

  // Handle local video playback
  useEffect(() => {
    if (!isInitializing && localVideoTrack && localPlayerRef.current) {
      localVideoTrack.play(localPlayerRef.current, { fit: 'cover' });
    }
  }, [localVideoTrack, localPlayerRef, isInitializing]);

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

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold text-white mb-2">ভিডিও কল শুরু হচ্ছে...</h2>
        <p className="text-slate-400">ক্যামেরা এবং মাইক্রোফোন প্রস্তুত করা হচ্ছে।</p>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">{permissionError.message}</h2>
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 max-w-md w-full mb-8">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 text-left">কিভাবে সমাধান করবেন?</h3>
          <ul className="space-y-3 text-left">
            <li className="flex gap-3 text-slate-400 text-sm">
              <span className="flex-shrink-0 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">১</span>
              ব্রাউজারের অ্যাড্রেস বারের বাম পাশে থাকা তালা (Lock) আইকনে ক্লিক করুন।
            </li>
            <li className="flex gap-3 text-slate-400 text-sm">
              <span className="flex-shrink-0 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">২</span>
              ক্যামেরা এবং মাইক্রোফোন 'Allow' বা চালু করে দিন।
            </li>
            <li className="flex gap-3 text-slate-400 text-sm">
              <span className="flex-shrink-0 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">৩</span>
              পেজটি একবার রিফ্রেশ করুন এবং পুনরায় চেষ্টা করুন।
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors"
          >
            পেজ রিফ্রেশ করুন
          </button>
          <button 
            onClick={onEnd}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors"
          >
            ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="relative w-full h-full bg-black overflow-hidden">
        {/* Remote Video (Main - Background) */}
        <div className="absolute inset-0 bg-black">
          {remoteUsers.length > 0 ? (
            <div className="w-full h-full">
              {remoteUsers.map(user => (
                <RemotePlayer key={user.uid} user={user} />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
                <Video size={40} className="text-slate-600" />
              </div>
              <p className="text-slate-400 font-medium px-6 text-center">অন্য অংশগ্রহণকারীর জন্য অপেক্ষা করা হচ্ছে...</p>
              <div className="bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Diagnostic Info</p>
                <p className="text-slate-300 text-xs font-mono">{debugInfo}</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PIP - Floating) */}
        <div 
          ref={localPlayerRef}
          className={cn(
            "absolute top-6 right-6 w-32 md:w-48 aspect-[9/16] md:aspect-video bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-30 transition-all cursor-move",
            !videoOn && "hidden"
          )}
        >
          {!videoOn && (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/80">
              <VideoOff size={20} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Top Info Overlay */}
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-40">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
          <span className="text-white text-xs font-medium uppercase tracking-wider">লাইভ</span>
        </div>

        {/* Controls Overlay (Bottom) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-[32px] border border-white/10 shadow-2xl z-50">
          <button 
            onClick={toggleMic}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full transition-all",
              micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"
            )}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          
          <button 
            onClick={toggleVideo}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full transition-all",
              videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"
            )}
          >
            {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          <button 
            onClick={handleEndCall}
            className="w-12 h-12 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-xl shadow-red-500/40"
          >
            <PhoneOff size={22} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <button 
            onClick={toggleFullScreen}
            className="w-10 h-10 flex items-center justify-center bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
          >
            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
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
  }, [user.videoTrack]);

  return (
    <div className="w-full h-full relative">
      <div ref={playerRef} className="w-full h-full" />
      {!user.videoTrack && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Camera size={48} className="text-slate-600" />
          </div>
          <p className="text-white font-medium">অংশগ্রহণকারী যুক্ত আছেন</p>
          <p className="text-slate-400 text-sm">ভিডিওর জন্য অপেক্ষা করা হচ্ছে...</p>
        </div>
      )}
    </div>
  );
}
