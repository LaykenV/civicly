import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter is required' },
        { status: 400 }
      );
    }

    // Build the GovInfo bulk data URL
    const govInfoUrl = `https://www.govinfo.gov/bulkdata/${endpoint}`;
    
    console.log('Fetching from GovInfo:', govInfoUrl);

    // Fetch data from GovInfo API
    const response = await fetch(govInfoUrl, {
      headers: {
        'Accept': 'application/json, text/xml, application/xml, */*',
        'User-Agent': 'Civicly-App/1.0',
      },
    });

    if (!response.ok) {
      console.error('GovInfo API error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: `GovInfo API returned ${response.status}: ${response.statusText}`,
          url: govInfoUrl 
        },
        { status: response.status }
      );
    }

    
    // Check content type to determine how to parse the response
    const contentType = response.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    let data;
    let responseType: 'json' | 'xml' | 'text' = 'text';
    
    if (contentType.includes('application/json')) {
      data = await response.json();
      responseType = 'json';
      console.log('Successfully parsed JSON data with', Object.keys(data).join(', '), 'properties');
      console.log(data);
    } else if (contentType.includes('xml')) {
      data = await response.text();
      responseType = 'xml';
      console.log('XML data length:', data.length, 'characters');
    } else {
      data = await response.text();
      responseType = 'text';
      console.log('Text data length:', data.length, 'characters');
    }
    
    // Return the data with metadata about the response type
    return NextResponse.json({
      data,
      responseType,
      contentType,
      url: govInfoUrl
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error in govinfo-proxy:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from GovInfo API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 