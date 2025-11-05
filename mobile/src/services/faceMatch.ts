export interface FaceMatchInput {
  selfieUrl: string
  galleryUrls: string[]
}

export interface FaceMatchResult {
  confidence: number
  provider: string
  evaluatedAt: string
}

export interface FaceMatchProvider {
  evaluate(input: FaceMatchInput): Promise<FaceMatchResult>
}

class PassthroughFaceMatchProvider implements FaceMatchProvider {
  async evaluate(_input: FaceMatchInput): Promise<FaceMatchResult> {
    return {
      confidence: 0,
      provider: 'passthrough',
      evaluatedAt: new Date().toISOString()
    }
  }
}

let provider: FaceMatchProvider = new PassthroughFaceMatchProvider()

export const registerFaceMatchProvider = (custom: FaceMatchProvider) => {
  provider = custom
}

export const evaluateFaceMatch = (input: FaceMatchInput) => provider.evaluate(input)
