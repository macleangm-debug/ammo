import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, 
  Calendar, User, Building, Award, FileText,
  ArrowLeft, Loader2, QrCode
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VerifyDocument = () => {
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();
  const hashParam = searchParams.get("h");
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyDocument();
  }, [documentId, hashParam]);

  const verifyDocument = async () => {
    setLoading(true);
    try {
      const url = hashParam 
        ? `${API_URL}/api/verify/${documentId}?h=${hashParam}`
        : `${API_URL}/api/verify/${documentId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Failed to connect to verification server");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      "achievement_certificate": "Achievement Certificate",
      "training_certificate": "Training Certificate",
      "license_certificate": "License Certificate",
      "compliance_certificate": "Compliance Certificate",
      "warning_letter": "Warning Letter",
      "formal_notice": "Formal Notice"
    };
    return labels[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-lg">Verifying document...</p>
          <p className="text-slate-500 text-sm mt-2">Document ID: {documentId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 border-red-500/30">
          <CardContent className="p-8 text-center">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Verification Error</h1>
            <p className="text-slate-400">{error}</p>
            <Button 
              onClick={verifyDocument}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full mb-6">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="text-slate-300 text-sm font-medium">AMMO Document Verification</span>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-2">
            <QrCode className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-bold text-white">Certificate Verification</h1>
          </div>
          <p className="text-slate-400">Verify the authenticity of official documents</p>
        </div>

        {/* Result Card */}
        <Card className={`border-2 ${
          result?.valid 
            ? "bg-emerald-900/20 border-emerald-500/50" 
            : "bg-red-900/20 border-red-500/50"
        }`}>
          <CardContent className="p-8">
            {/* Status Icon */}
            <div className="text-center mb-6">
              {result?.valid ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-14 h-14 text-emerald-400" />
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-lg px-4 py-1">
                    ✓ VERIFIED AUTHENTIC
                  </Badge>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-14 h-14 text-red-400" />
                  </div>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-lg px-4 py-1">
                    ✗ VERIFICATION FAILED
                  </Badge>
                </>
              )}
            </div>

            {/* Message */}
            <p className={`text-center text-lg mb-8 ${
              result?.valid ? "text-emerald-300" : "text-red-300"
            }`}>
              {result?.message}
            </p>

            {/* Document Details (if valid) */}
            {result?.valid && result?.document && (
              <div className="space-y-4 bg-slate-800/50 rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg border-b border-slate-700 pb-3 mb-4">
                  Document Details
                </h3>
                
                <div className="grid gap-4">
                  {/* Document Title */}
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-indigo-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Document Title</p>
                      <p className="text-white font-medium">{result.document.title}</p>
                    </div>
                  </div>

                  {/* Document Type */}
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Document Type</p>
                      <p className="text-white font-medium">
                        {getDocumentTypeLabel(result.document.document_type)}
                      </p>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Issued To</p>
                      <p className="text-white font-medium">{result.document.recipient_name}</p>
                    </div>
                  </div>

                  {/* Issue Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Issue Date</p>
                      <p className="text-white font-medium">{formatDate(result.document.issued_at)}</p>
                    </div>
                  </div>

                  {/* Issuer */}
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Issuing Authority</p>
                      <p className="text-white font-medium">
                        {result.document.issuer_signature_name}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {result.document.issuer_designation}, {result.document.organization_name}
                      </p>
                    </div>
                  </div>

                  {/* Verification Hash */}
                  <div className="flex items-start gap-3 pt-3 border-t border-slate-700">
                    <Shield className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-400 text-sm">Verification Hash</p>
                      <p className="text-slate-500 font-mono text-xs">{result.verification_hash}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details (if invalid) */}
            {!result?.valid && (
              <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-red-400 font-semibold">{result?.error}</h3>
                </div>
                <p className="text-slate-400 text-sm">
                  If you believe this document should be valid, please contact the issuing authority 
                  or the AMMO Government Portal support team.
                </p>
              </div>
            )}

            {/* Verification Timestamp */}
            <div className="mt-6 pt-4 border-t border-slate-700 text-center">
              <p className="text-slate-500 text-sm">
                Verification performed at: {formatDate(result?.verified_at || new Date().toISOString())}
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Document ID: {documentId}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link to="/">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to AMMO Portal
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>AMMO - Accountable Munitions & Mobility Oversight</p>
          <p className="mt-1">Secure document verification powered by SHA-256 cryptographic hashing</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyDocument;
