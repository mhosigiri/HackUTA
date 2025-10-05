// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Activity {
  id: string;
  type: 'upload' | 'extraction' | 'download' | 'profile_update';
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  documentName?: string;
}

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  status: 'processed' | 'processing' | 'failed';
  extractedData?: any;
}

const Activities: React.FC = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activities' | 'documents'>('activities');

  const fetchActivitiesAndDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: (process.env.REACT_APP_AUTH0_SCOPE as string) || 'openid profile email offline_access'
        }
      });
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

      // TODO: Replace with actual API endpoints
      const [activitiesRes, documentsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/activities`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiBaseUrl}/api/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!activitiesRes.ok || !documentsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const activitiesData = await activitiesRes.json();
      const documentsData = await documentsRes.json();

      setActivities(activitiesData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Keep the page empty in case of an error
      setActivities([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    fetchActivitiesAndDocuments();
  }, [fetchActivitiesAndDocuments]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    let diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) diffMs = 0; // Guard against future timestamps
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'upload':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
          </svg>
        );
      case 'extraction':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        );
      case 'download':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'profile_update':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusBadge = (status: Activity['status'] | Document['status']) => {
    const statusStyles = {
      success: 'bg-green-100 text-green-800',
      processed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const Folder = () => {
    const color = new THREE.Color('#f3f4f6');
    const tabColor = new THREE.Color('#e5e7eb');
    return (
      <group>
        {/* Folder body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.4, 1.6, 0.25]} />
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.4} />
        </mesh>
        {/* Folder tab */}
        <mesh position={[-0.6, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.4, 0.25]} />
          <meshStandardMaterial color={tabColor} metalness={0.2} roughness={0.4} />
        </mesh>
      </group>
    );
  };

  const EmptyFoldersScene: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const leftRef = useRef<THREE.Group>(null);
    const centerRef = useRef<THREE.Group>(null);
    const rightRef = useRef<THREE.Group>(null);
    const controlsRef = useRef<any>(null);
    const { camera, pointer } = useThree();

    // Default camera and target
    const defaultPos = new THREE.Vector3(4, 3, 5);
    const defaultTarget = new THREE.Vector3(0, 0.2, 0);
    const camTargetPos = useRef(defaultPos.clone());
    const orbitTarget = useRef(defaultTarget.clone());

    // Parallax hover based on pointer
    useFrame(() => {
      if (groupRef.current) {
        const rotX = THREE.MathUtils.lerp(groupRef.current.rotation.x, pointer.y * 0.2, 0.05);
        const rotY = THREE.MathUtils.lerp(groupRef.current.rotation.y, -pointer.x * 0.3, 0.05);
        groupRef.current.rotation.x = rotX;
        groupRef.current.rotation.y = rotY;
      }

      // Smoothly move camera toward target position and look target
      camera.position.lerp(camTargetPos.current, 0.06);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(orbitTarget.current, 0.08);
        controlsRef.current.update();
      } else {
        camera.lookAt(orbitTarget.current);
      }
    });

    const focusOn = (pos?: THREE.Vector3) => {
      if (!pos) return;
      // Calculate a pleasant offset to the side and above
      const offset = new THREE.Vector3(2.2, 1.6, 2.2);
      camTargetPos.current = pos.clone().add(offset);
      orbitTarget.current = pos.clone();
      if (controlsRef.current) controlsRef.current.autoRotate = false;
    };

    const resetFocus = () => {
      camTargetPos.current = defaultPos.clone();
      orbitTarget.current = defaultTarget.clone();
      if (controlsRef.current) controlsRef.current.autoRotate = true;
    };

    const onGroupClick = (ref: React.RefObject<THREE.Group | null>) => () => {
      if (!ref.current) return;
      const pos = new THREE.Vector3();
      ref.current.getWorldPosition(pos);
      focusOn(pos);
    };

    return (
      <>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <Environment preset="city" />
        <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.5}>
          <group ref={groupRef} position={[0, 0.2, 0]}> 
            <group ref={leftRef} position={[ -1.8, 0, 0 ]} onClick={onGroupClick(leftRef)}>
              <Folder />
            </group>
            <group ref={centerRef} position={[ 0, 0, 0 ]} onClick={onGroupClick(centerRef)}>
              <Folder />
            </group>
            <group ref={rightRef} position={[ 1.8, 0, 0 ]} onClick={onGroupClick(rightRef)}>
              <Folder />
            </group>
          </group>
        </Float>
        <ContactShadows position={[0, -0.8, 0]} opacity={0.35} scale={10} blur={2.5} far={2} />
        <OrbitControls ref={controlsRef} enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
        {/* Click on background to reset focus */}
        <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={resetFocus} visible={false}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Activity History</h1>
          <p className="text-lg text-gray-600">Track your document uploads and extractions</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('activities')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activities'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recent Activities
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Documents
              </button>
            </nav>
          </div>
        </div>

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No activities yet</h3>
                <p className="text-gray-600">Start uploading documents to see your activity history</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full ${
                        activity.status === 'success' ? 'bg-green-100 text-green-600' :
                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {activity.description}
                        </h3>
                        {activity.documentName && (
                          <p className="text-sm text-gray-600 mb-2">
                            Document: <span className="font-medium">{activity.documentName}</span>
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {documents.length === 0 ? (
              <div className="relative w-full h-[520px] bg-gradient-to-br from-gray-50 to-blue-50">
                <Canvas shadows camera={{ position: [4, 3, 5], fov: 45 }}>
                  <EmptyFoldersScene />
                </Canvas>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No documents yet</h3>
                  <p className="text-gray-600">Your empty folders are ready. Upload to get started.</p>
                </div>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatTimestamp(doc.uploadDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {doc.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                        <button className="text-green-600 hover:text-green-900 mr-3">Download</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>) }
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
