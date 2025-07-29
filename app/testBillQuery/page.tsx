'use client';

import { useState, useEffect } from 'react';

interface BillFile {
  mimeType: string;
  size: number;
  formattedLastModifiedTime: string;
  name: string;
  folder: boolean;
  displayLabel: string;
  formattedSize: string;
  link: string;
  justFileName: string;
  fileExtension: string;
}

interface BillData {
  files?: BillFile[];
  [key: string]: unknown; // Allow additional properties
}

interface ApiResponse {
  data: BillData | string;
  responseType: 'json' | 'xml' | 'text';
  contentType: string;
  url: string;
}

export default function TestBillQuery() {
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillData = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpoint = 'BILLS/119/1/hconres/BILLS-119hconres1eh.xml';

        // Fetch bills from the 119th Congress (current/recent)
        const response = await fetch(`/api/govinfo-proxy?endpoint=${endpoint}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setApiResponse(data);
      } catch (err) {
        console.error('Error fetching bill data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch bill data');
      } finally {
        setLoading(false);
      }
    };

    fetchBillData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            GovInfo Bill Data Test
          </h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Loading bill data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            GovInfo Bill Data Test
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!apiResponse) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            GovInfo Bill Data Test
          </h1>
          <div className="text-center py-12">
            <p className="text-gray-600">No data received</p>
          </div>
        </div>
      </div>
    );
  }

  const billData = apiResponse.responseType === 'json' ? apiResponse.data as BillData : null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          GovInfo Bill Data Test
        </h1>
        
        <div className="space-y-6">
          {/* API Response Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              API Response Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 text-sm font-medium">Response Type</div>
                <div className="text-2xl font-bold text-blue-900 uppercase">{apiResponse.responseType}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 text-sm font-medium">Content Type</div>
                <div className="text-sm text-green-900">{apiResponse.contentType}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-purple-600 text-sm font-medium">Source URL</div>
                <div className="text-xs text-purple-900 break-all">
                  <a href={apiResponse.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {apiResponse.url}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* JSON Data Display (for JSON responses) */}
          {apiResponse.responseType === 'json' && billData && (
            <>
              {/* Summary Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  JSON Response Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 text-sm font-medium">Total Files</div>
                    <div className="text-2xl font-bold text-blue-900">{billData.files?.length || 0}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-600 text-sm font-medium">XML Files</div>
                    <div className="text-sm text-green-900">
                      {billData.files?.filter(f => f.fileExtension === 'xml').length || 0}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 text-sm font-medium">ZIP Files</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {billData.files?.filter(f => f.fileExtension === 'zip').length || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bills List */}
              {billData.files && billData.files.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Recent Bill Files (First 10)
                  </h2>
                  <div className="space-y-3">
                    {billData.files.slice(0, 10).map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <a 
                              href={file.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              {file.displayLabel}
                            </a>
                            <div className="text-sm text-gray-500 mt-1">
                              Size: {file.formattedSize} | Last Modified: {file.formattedLastModifiedTime} | Type: {file.mimeType}
                            </div>
                          </div>
                          <div className="ml-4 flex space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              file.fileExtension === 'xml' ? 'bg-green-100 text-green-700' : 
                              file.fileExtension === 'zip' ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {file.fileExtension.toUpperCase()}
                            </span>
                            <a 
                              href={file.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* XML Data Display (for XML responses) */}
          {apiResponse.responseType === 'xml' && typeof apiResponse.data === 'string' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                XML Bill Content
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  This is the full XML content of the bill. You can copy this to analyze the structure.
                </div>
                <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-auto text-xs max-h-96 font-mono">
                  {apiResponse.data}
                </pre>
              </div>
              
              {/* Quick XML info */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">XML Structure Info</h3>
                <div className="text-sm text-blue-800">
                  <p>• Character count: {apiResponse.data.length.toLocaleString()}</p>
                  <p>• Contains bill metadata, full text, and legislative markup</p>
                  <p>• This is USLM (United States Legislative Markup) format</p>
                </div>
              </div>
            </div>
          )}

          {/* Raw API Response */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Raw API Response Metadata
            </h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm text-black">
              {JSON.stringify({
                responseType: apiResponse.responseType,
                contentType: apiResponse.contentType,
                url: apiResponse.url,
                dataPreview: apiResponse.responseType === 'xml' && typeof apiResponse.data === 'string'
                  ? `${apiResponse.data.substring(0, 200)}...` 
                  : typeof apiResponse.data === 'object' ? 'JSON Object' : 'Unknown'
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
