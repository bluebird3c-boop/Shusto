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

// Setting log level to Warning to avoid console spam but show issues
AgoraRTC.setLogLevel(2);

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

  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  useEffect(() => {
    let agoraClient: IAgoraRTCClient;

    const init = async () => {
      try {
        agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        agoraClient.on('user-published', async (user, mediaType) => {
          console.log("Remote signal - Published:", user.uid, mediaType);
          try {
            await agoraClient.subscribe(user, mediaType);
            console.log("Remote signal - Subscribed:", user.uid, mediaType);
            
            // Always update users on any subscribe to ensure we have the latest track references
            setRemoteUsers((prev) => {
              const others = prev.filter(u => u.uid !== user.uid);
              return [...others, user];
            });

            if (mediaType === 'audio') {
              user.audioTrack?.play();
            }
          } catch (e) {
            console.error("Subscription failed:", e);
          }
        });

        agoraClient.on('user-unpublished', (user, mediaType) => {
          console.log("Remote signal - Unpublished:", user.uid, mediaType);
          if (mediaType === 'video') {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
          }
        });

        await agoraClient.join(APP_ID, channelName, null, Math.floor(Math.random() * 1000000));
        console.log("Joined channel:", channelName);

        // Attempt to create tracks - this should trigger the permission prompt
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack().catch(e => {
          console.warn("Microphone access failed/denied:", e);
          return null;
        });

        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: "720p_1"
        }).catch(e => {
          console.warn("Camera access failed/denied:", e);
          return null;
        });
        
        if (audioTrack) {
          setLocalAudioTrack(audioTrack);
          localAudioTrackRef.current = audioTrack;
        }
        if (videoTrack) {
          setLocalVideoTrack(videoTrack);
          localVideoTrackRef.current = videoTrack;
        }
        
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
      localAudioTrackRef.current?.stop();
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.stop();
      localVideoTrackRef.current?.close();
      agoraClient?.leave();
    };
  }, [channelName]);

  // Handle local video playback
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const playLocal = async () => {
      if (localVideoTrack && localPlayerRef.current) {
        console.log("Playing local track...");
        try {
          localVideoTrack.stop();
          if (isMounted) {
            await localVideoTrack.play(localPlayerRef.current, { fit: 'cover' });
          }
        } catch (e) {
          console.error("Local play error:", e);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(playLocal, 1000);
          }
        }
      }
    };
    
    // Add a slight delay to ensure DOM is fully ready
    const timer = setTimeout(playLocal, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
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
        <div className="absolute inset-0 bg-black">
          {remoteUsers.length > 0 ? (
            <div className="w-full h-full">
              <RemotePlayer user={remoteUsers[0]} />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
                <Video size={40} className="text-slate-600" />
              </div>
              <p className="text-slate-400 font-medium px-6 text-center">অন্য অংশগ্রহণকারীর জন্য অপেক্ষা করা হচ্ছে...</p>
            </div>
          )}
        </div>

        {/* Local Video (PIP - Floating) */}
        {localVideoTrack && (
          <div 
            ref={localPlayerRef}
            className="absolute top-6 right-6 w-32 md:w-48 aspect-[9/16] bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-[70] transition-all"
            style={{ touchAction: 'none' }}
          />
        )}

        {/* Permission Notice */}
        {isConnected && !localVideoTrack && (
          <div className="absolute inset-0 z-[60] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
             <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
               <VideoOff size={32} />
             </div>
             <h2 className="text-xl font-bold text-white mb-2">ক্যামেরা পারমিশন প্রয়োজন</h2>
             <p className="text-slate-400 max-w-xs mb-6">ভিডিও কল শুরু করার জন্য আপনার ব্রাউজারে ক্যামেরা এবং মাইক্রোফোনের অনুমতি দিন।</p>
             <button 
               onClick={() => window.location.reload()}
               className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold"
             >
               রিফ্রেশ করুন
             </button>
          </div>
        )}

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
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const playTrack = async () => {
      if (playerRef.current && user.videoTrack) {
        console.log("Playing remote track for:", user.uid);
        try {
          user.videoTrack.stop();
          if (isMounted) {
            await user.videoTrack.play(playerRef.current, { fit: 'cover' });
          }
        } catch (e) {
          console.error("Remote video play error:", e);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(playTrack, 1000);
          }
        }
      }
    };

    const timer = setTimeout(playTrack, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      user.videoTrack?.stop();
    };
  }, [user.videoTrack, user.uid]);

  return <div ref={playerRef} className="w-full h-full" />;
}
