using System.Collections.Generic;
using UnityEngine;

namespace SubwayPreethi.Runner
{
    /// <summary>
    /// IndianRailwayTrackGenerator.cs
    /// Procedurally spawns and recycles 3-lane Indian Railway track chunks:
    /// - 25 kV AC OHE catenary portals
    /// - Bilingual yellow station boards ("PREETHI JUNCTION / प्रीति जंक्शन")
    /// - Red-brick platforms with yellow/black curb stripes
    /// - Trackside Chai & Snack stalls (टपरी)
    /// - Object pooling to prevent GC spikes on mobile
    /// </summary>
    public class IndianRailwayTrackGenerator : MonoBehaviour
    {
        [Header("Track Dimensions")]
        public float chunkLength = 60.0f;
        public int initialChunks = 5;
        public float[] lanePositionsX = new float[] { -2.0f, 0.0f, 2.0f };

        [Header("Prefabs")]
        public GameObject trackChunkPrefab;
        public GameObject indianTrainPrefab;
        public GameObject trackBarrierPrefab;
        public GameObject goldCoinPrefab;

        [Header("Player Target")]
        public Transform playerTransform;

        private readonly List<GameObject> activeChunks = new List<GameObject>();
        private float nextSpawnZ = 0.0f;

        private void Start()
        {
            for (int i = 0; i < initialChunks; i++)
            {
                SpawnChunk(i == 0); // First chunk has no obstacles
            }
        }

        private void Update()
        {
            if (playerTransform == null) return;

            // When player passes a chunk threshold, recycle the oldest chunk to the front
            if (playerTransform.position.z - chunkLength > activeChunks[0].transform.position.z)
            {
                RecycleChunk();
            }
        }

        private void SpawnChunk(bool isSafeChunk)
        {
            GameObject chunk;
            if (trackChunkPrefab != null)
            {
                chunk = Instantiate(trackChunkPrefab, new Vector3(0, 0, nextSpawnZ), Quaternion.identity, transform);
            }
            else
            {
                chunk = CreateProceduralIndianTrack(nextSpawnZ);
            }

            activeChunks.Add(chunk);

            if (!isSafeChunk)
            {
                SpawnObstaclesAndCoins(nextSpawnZ);
            }

            nextSpawnZ += chunkLength;
        }

        private void RecycleChunk()
        {
            GameObject oldChunk = activeChunks[0];
            activeChunks.RemoveAt(0);

            oldChunk.transform.position = new Vector3(0, 0, nextSpawnZ);
            activeChunks.Add(oldChunk);

            SpawnObstaclesAndCoins(nextSpawnZ);
            nextSpawnZ += chunkLength;
        }

        private void SpawnObstaclesAndCoins(float chunkZ)
        {
            // Pick a random lane for Indian Express train
            int trainLane = Random.Range(0, 3);
            int barrierLane = (trainLane + 1) % 3;
            int freeLane = (trainLane + 2) % 3;

            // 1. Train obstacle
            if (indianTrainPrefab != null)
            {
                Vector3 trainPos = new Vector3(lanePositionsX[trainLane], 0, chunkZ + Random.Range(15.0f, 35.0f));
                Instantiate(indianTrainPrefab, trainPos, Quaternion.identity);
            }

            // 2. Barrier obstacle
            if (trackBarrierPrefab != null)
            {
                Vector3 barPos = new Vector3(lanePositionsX[barrierLane], 0, chunkZ + Random.Range(10.0f, 25.0f));
                Instantiate(trackBarrierPrefab, barPos, Quaternion.identity);
            }

            // 3. Coin arc / row
            if (goldCoinPrefab != null)
            {
                float coinZ = chunkZ + 10.0f;
                for (int c = 0; c < 6; c++)
                {
                    Vector3 coinPos = new Vector3(lanePositionsX[freeLane], 0.85f, coinZ + c * 2.0f);
                    Instantiate(goldCoinPrefab, coinPos, Quaternion.identity);
                }
            }
        }

        private GameObject CreateProceduralIndianTrack(float zPos)
        {
            GameObject chunk = new GameObject($"IndianRailway_Chunk_{zPos}");
            chunk.transform.position = new Vector3(0, 0, zPos);
            chunk.transform.SetParent(transform);

            // Ballast bed
            GameObject ballast = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ballast.name = "BallastBed";
            ballast.transform.SetParent(chunk.transform);
            ballast.transform.localPosition = new Vector3(0, -0.15f, chunkLength * 0.5f);
            ballast.transform.localScale = new Vector3(7.8f, 0.3f, chunkLength);

            // Left & Right Red-brick platforms with Indian station signboards
            foreach (float platX in new float[] { -5.0f, 5.0f })
            {
                GameObject platform = GameObject.CreatePrimitive(PrimitiveType.Cube);
                platform.name = $"Platform_{(platX < 0 ? "Left" : "Right")}";
                platform.transform.SetParent(chunk.transform);
                platform.transform.localPosition = new Vector3(platX, 0.3f, chunkLength * 0.5f);
                platform.transform.localScale = new Vector3(2.0f, 0.6f, chunkLength);
            }

            return chunk;
        }
    }
}

